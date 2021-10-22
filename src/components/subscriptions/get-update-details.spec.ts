import Knex from "knex";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PlansDAO from "../plans/dao";
import TeamUsersDAO from "../team-users/dao";
import * as SubscriptionsDAO from "./dao";
import { PlanStripePriceType } from "../../components/plan-stripe-price/types";
import * as UpgradeStripeSubscription from "../../services/stripe/upgrade-subscription";
import Logger from "../../services/logger";
import InvalidDataError from "../../errors/invalid-data";
import * as StripeAPI from "../../services/stripe/api";

import { getTeamSubscriptionUpdateDetails } from "./get-update-details";

const mockedPlan = {
  id: "a-plan-id",
  createdAt: new Date(),
  baseCostPerBillingIntervalCents: 100_00,
  perSeatCostPerBillingIntervalCents: 20_00,
  stripePrices: [
    {
      planId: "a-plan-id",
      stripePriceId: "a-stripe-price-id",
      type: PlanStripePriceType.BASE_COST,
    },
    {
      planId: "a-plan-id",
      stripePriceId: "another-stripe-price-id",
      type: PlanStripePriceType.PER_SEAT,
    },
  ],
};

const mockedCalaSubscription = {
  id: "a-subscription-id",
  cancelledAt: null,
  isPaymentWaived: false,
  paymentMethodId: "a-payment-method-id",
  planId: "an-old-plan-id",
  stripeSubscriptionId: "a-stripe-subscription-id",
  teamId: "a-team-id",
};

function setup({
  subscriptionStatus = "active",
}: {
  subscriptionStatus?: string;
} = {}) {
  const testDate = new Date(2012, 11, 25);
  const clock = sandbox().useFakeTimers(testDate);
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  const findPlanStub = sandbox()
    .stub(PlansDAO, "findById")
    .onFirstCall()
    .resolves({ ...mockedPlan, id: "a-plan-id" })
    .onSecondCall()
    .resolves({ ...mockedPlan, id: "an-old-plan-id" });
  const findActiveTeamSubscriptionStub = sandbox()
    .stub(SubscriptionsDAO, "findActiveByTeamId")
    .resolves(mockedCalaSubscription);
  const countBilledUsersTeamUsersStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(3);
  const prepareUpgradeStub = sandbox()
    .stub(UpgradeStripeSubscription, "prepareUpgrade")
    .resolves({
      upcomingInvoice: {
        id: "a-stripe-invoice-id",
        subtotal: 100_00,
        total: 100_00,
        status: "active",
        subscription_proration_date: new Date(2012, 11, 24).getTime(),
      },
      updateRequest: {
        proration_behavior: "always_invoice",
      },
    });
  const getSubscriptionStub = sandbox()
    .stub(StripeAPI, "getSubscription")
    .resolves({
      status: subscriptionStatus,
    });
  const updateSubscriptionStub = sandbox().stub(SubscriptionsDAO, "update");
  const loggerStub = sandbox().stub(Logger, "logServerError");
  return {
    trxStub,
    findPlanStub,
    findActiveTeamSubscriptionStub,
    prepareUpgradeStub,
    countBilledUsersTeamUsersStub,
    loggerStub,
    testDate,
    clock,
    getSubscriptionStub,
    updateSubscriptionStub,
  };
}

test("throws error if plan doesn't exists", async (t: Test) => {
  const { trxStub, findPlanStub, prepareUpgradeStub, loggerStub } = setup();
  findPlanStub.onFirstCall().resolves(null);

  try {
    await getTeamSubscriptionUpdateDetails(trxStub, {
      planId: "a-plan-id",
      teamId: "a-team-id",
    });
    t.fail("should not succeed");
  } catch (err) {
    t.equal(err instanceof InvalidDataError, true);
    t.equal(
      err.message,
      "Plan on which we want to upgrade to is not found",
      "throws correct client error message when plan is not found"
    );
    t.equal(
      loggerStub.args[0][0],
      "Plan on which we want to upgrade to is not found with id: a-plan-id | team id: a-team-id",
      "log correct server error message when plan is not found"
    );
  }

  t.equal(
    prepareUpgradeStub.callCount,
    0,
    "does not make any requests to Stripe"
  );
});

test("returns 0 when downgrading from paid plan to a free plan", async (t: Test) => {
  const { trxStub, findPlanStub, prepareUpgradeStub, testDate } = setup();
  // retrieve new plan
  findPlanStub.onFirstCall().resolves({
    ...mockedPlan,
    baseCostPerBillingIntervalCents: 0,
    perSeatCostPerBillingIntervalCents: 0,
  });
  // retrieve current plan
  findPlanStub.onSecondCall().resolves({
    ...mockedPlan,
    id: "an-old-plan-id",
    baseCostPerBillingIntervalCents: 2000,
    perSeatCostPerBillingIntervalCents: 200,
  });

  const updateDetails = await getTeamSubscriptionUpdateDetails(trxStub, {
    planId: "a-plan-id",
    teamId: "a-team-id",
  });

  t.deepEqual(
    updateDetails,
    {
      proratedChargeCents: 0,
      prorationDate: testDate,
    },
    "returns correct prorated update details"
  );

  t.deepEqual(
    findPlanStub.args,
    [
      [trxStub, "a-plan-id"],
      [trxStub, "an-old-plan-id"],
    ],
    "calls findPlan with correct args and planId"
  );

  t.equal(
    prepareUpgradeStub.callCount,
    0,
    "does not make any requests to Stripe"
  );
});

test("returns plan price if no active subscription", async (t: Test) => {
  const {
    trxStub,
    findActiveTeamSubscriptionStub,
    prepareUpgradeStub,
    testDate,
  } = setup();
  findActiveTeamSubscriptionStub.resolves(null);

  const updateDetails = await getTeamSubscriptionUpdateDetails(trxStub, {
    planId: "a-plan-id",
    teamId: "a-team-id",
  });

  t.deepEqual(
    updateDetails,
    {
      proratedChargeCents: 100_00 + 20_00 * 3,
      prorationDate: testDate,
    },
    "returns full plan cost and today's date"
  );

  t.equal(
    prepareUpgradeStub.callCount,
    0,
    "does not make any requests to Stripe"
  );
});

test("gets prorated upgrade details", async (t: Test) => {
  const {
    trxStub,
    findPlanStub,
    findActiveTeamSubscriptionStub,
    countBilledUsersTeamUsersStub,
    prepareUpgradeStub,
  } = setup();

  const updateDetails = await getTeamSubscriptionUpdateDetails(trxStub, {
    planId: "a-plan-id",
    teamId: "a-team-id",
  });

  t.deepEqual(
    updateDetails,
    {
      proratedChargeCents: 100_00,
      prorationDate: new Date(2012, 11, 24),
    },
    "returns correct prorated update details"
  );

  t.deepEqual(
    findPlanStub.args,
    [
      [trxStub, "a-plan-id"],
      [trxStub, "an-old-plan-id"],
    ],
    "calls findPlan with correct args and planId"
  );
  t.deepEqual(
    findActiveTeamSubscriptionStub.args,
    [[trxStub, "a-team-id"]],
    "calls find active team subscription with correct args and team id"
  );
  t.deepEqual(
    countBilledUsersTeamUsersStub.args,
    [[trxStub, "a-team-id"]],
    "calls method to get count of non viewers team users with correct team id"
  );
  t.deepEqual(
    prepareUpgradeStub.args,
    [
      [
        {
          stripeSubscriptionId: mockedCalaSubscription.stripeSubscriptionId,
          newPlan: mockedPlan,
          seatCount: 3,
        },
      ],
    ],
    "calls upgrade stripe subscription with correct args"
  );
});

test("returns 0 cost when not prorating", async (t: Test) => {
  const {
    trxStub,
    findPlanStub,
    findActiveTeamSubscriptionStub,
    countBilledUsersTeamUsersStub,
    prepareUpgradeStub,
    testDate,
  } = setup();

  prepareUpgradeStub.resolves({
    upcomingInvoice: {
      id: "a-stripe-invoice-id",
      subtotal: -100_00,
      total: -100_00,
      status: "active",
      subscription_proration_date: new Date(2012, 11, 24).getTime(),
    },
    updateRequest: {
      proration_behavior: "none",
    },
  });

  const updateDetails = await getTeamSubscriptionUpdateDetails(trxStub, {
    planId: "a-plan-id",
    teamId: "a-team-id",
  });

  t.deepEqual(
    updateDetails,
    {
      proratedChargeCents: 0,
      prorationDate: testDate,
    },
    "returns correct prorated update details"
  );

  t.deepEqual(
    findPlanStub.args,
    [
      [trxStub, "a-plan-id"],
      [trxStub, "an-old-plan-id"],
    ],
    "calls findPlan with correct args and planId"
  );
  t.deepEqual(
    findActiveTeamSubscriptionStub.args,
    [[trxStub, "a-team-id"]],
    "calls find active team subscription with correct args and team id"
  );
  t.deepEqual(
    countBilledUsersTeamUsersStub.args,
    [[trxStub, "a-team-id"]],
    "calls method to get count of non viewers team users with correct team id"
  );
  t.deepEqual(
    prepareUpgradeStub.args,
    [
      [
        {
          stripeSubscriptionId: mockedCalaSubscription.stripeSubscriptionId,
          newPlan: mockedPlan,
          seatCount: 3,
        },
      ],
    ],
    "calls upgrade stripe subscription with correct args"
  );
});

test("returns plan price if subscription has been canceled in Stripe", async (t: Test) => {
  const { trxStub, testDate, updateSubscriptionStub } = setup({
    subscriptionStatus: "canceled",
  });

  const updateDetails = await getTeamSubscriptionUpdateDetails(trxStub, {
    planId: "a-plan-id",
    teamId: "a-team-id",
  });

  t.deepEqual(
    updateDetails,
    {
      proratedChargeCents: 100_00 + 20_00 * 3,
      prorationDate: testDate,
    },
    "returns full plan cost and today's date"
  );

  t.equal(
    updateSubscriptionStub.firstCall.args[0],
    "a-subscription-id",
    "updates the correct subscription "
  );
  t.deepEqual(
    updateSubscriptionStub.firstCall.args[1],
    { cancelledAt: testDate },
    "cancels the subscription"
  );
});
