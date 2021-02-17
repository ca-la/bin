import Knex from "knex";
import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PlansDAO from "../plans/dao";
import TeamUsersDAO from "../team-users/dao";
import * as SubscriptionsDAO from "./dao";
import { PlanStripePriceType } from "../../components/plan-stripe-price/types";
import { upgradeTeamSubscription } from "./upgrade";
import * as CreateSubscriptionFlow from "./create";
import * as CreatePaymentMethod from "../payment-methods/create-payment-method";
import * as UpgradeStripeSubscription from "../../services/stripe/upgrade-subscription";
import InvalidDataError from "../../errors/invalid-data";

const mockedPlan = {
  id: "a-plan-id",
  createdAt: new Date(),
  baseCostPerBillingIntervalCents: 100,
  perSeatCostPerBillingIntervalCents: 20,
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
  userId: null,
  teamId: "a-team-id",
};

async function setup() {
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
  const createSubscriptionFlowStub = sandbox()
    .stub(CreateSubscriptionFlow, "createSubscription")
    .resolves();
  const updateCalaSubscriptionStub = sandbox()
    .stub(SubscriptionsDAO, "update")
    .resolves();
  const createCalaSubscriptionStub = sandbox()
    .stub(SubscriptionsDAO, "create")
    .resolves();
  const createPaymentMethodStub = sandbox()
    .stub(CreatePaymentMethod, "default")
    .resolves({
      stripeSourceId: "a-stripe-source-id",
      id: "a-new-payment-method-id",
    });
  const countBilledUsersTeamUsersStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(3);
  const upgradeStripeSubscriptionStub = sandbox()
    .stub(UpgradeStripeSubscription, "default")
    .resolves({
      id: "a-stripe-subscription-id",
    });
  return {
    trxStub,
    findPlanStub,
    findActiveTeamSubscriptionStub,
    createPaymentMethodStub,
    upgradeStripeSubscriptionStub,
    updateCalaSubscriptionStub,
    createCalaSubscriptionStub,
    countBilledUsersTeamUsersStub,
    createSubscriptionFlowStub,
  };
}

test("upgradeTeamSubscription: throws error if plan doesn't exists", async (t: Test) => {
  const {
    trxStub,
    findPlanStub,
    createPaymentMethodStub,
    createSubscriptionFlowStub,
    createCalaSubscriptionStub,
    upgradeStripeSubscriptionStub,
  } = await setup();
  findPlanStub.onFirstCall().resolves();

  try {
    await upgradeTeamSubscription(trxStub, {
      planId: "a-plan-id",
      teamId: "a-team-id",
      userId: "a-user-id",
      stripeCardToken: "a-stripe-card-token",
    });
    t.fail("should not succeed");
  } catch (err) {
    t.equal(err instanceof InvalidDataError, true);
    t.equal(
      err.message,
      "Plan on which we want to upgrade to is not found with id: a-plan-id",
      "throws correct error message when plan is not found"
    );
  }

  t.equal(
    createPaymentMethodStub.callCount,
    0,
    "does not create Stripe source or new payment method"
  );

  t.equal(
    createSubscriptionFlowStub.callCount,
    0,
    "doesn't call create subscription flow"
  );
  t.equal(
    createCalaSubscriptionStub.callCount,
    0,
    "does not create new Cala subscription"
  );
  t.equal(
    upgradeStripeSubscriptionStub.callCount,
    0,
    "does not make any requests to Stripe"
  );
});

test("upgradeTeamSubscription: throws error when tries to downgrade from paid plan to a free plan", async (t: Test) => {
  const {
    trxStub,
    findPlanStub,
    createPaymentMethodStub,
    createSubscriptionFlowStub,
    createCalaSubscriptionStub,
    upgradeStripeSubscriptionStub,
  } = await setup();
  // retrieve new plan
  findPlanStub.onFirstCall().resolves({
    ...mockedPlan,
    baseCostPerBillingIntervalCents: 0,
    perSeatCostPerBillingIntervalCents: 0,
  });
  // retrieve current plan
  findPlanStub.onSecondCall().resolves({
    ...mockedPlan,
    baseCostPerBillingIntervalCents: 2000,
    perSeatCostPerBillingIntervalCents: 200,
  });

  try {
    await upgradeTeamSubscription(trxStub, {
      planId: "a-plan-id",
      teamId: "a-team-id",
      userId: "a-user-id",
      stripeCardToken: "a-stripe-card-token",
    });
    t.fail("should not succeed");
  } catch (err) {
    t.equal(err instanceof InvalidDataError, true);
    t.equal(
      err.message,
      "Downgrade from paid plan to a free plan (id a-plan-id) is not supported.",
      "throws correct error message when team's subscription doesn't have a stripe id"
    );
  }

  t.deepEqual(
    findPlanStub.args,
    [
      [trxStub, "a-plan-id"],
      [trxStub, "an-old-plan-id"],
    ],
    "calls findPlan with correct args and planId"
  );

  t.equal(
    createPaymentMethodStub.callCount,
    0,
    "does not create Stripe source or new payment method"
  );
  t.equal(
    createSubscriptionFlowStub.callCount,
    0,
    "doesn't call create subscription flow"
  );
  t.equal(
    createCalaSubscriptionStub.callCount,
    0,
    "does not create new Cala subscription"
  );
  t.equal(
    upgradeStripeSubscriptionStub.callCount,
    0,
    "does not make any requests to Stripe"
  );
});

test("upgradeTeamSubscription: upgrade from free plan to a free plan without stripeCardToken", async (t: Test) => {
  const {
    trxStub,
    findPlanStub,
    createPaymentMethodStub,
    createSubscriptionFlowStub,
    createCalaSubscriptionStub,
    upgradeStripeSubscriptionStub,
  } = await setup();
  findPlanStub.onFirstCall().resolves({
    ...mockedPlan,
    baseCostPerBillingIntervalCents: 0,
    perSeatCostPerBillingIntervalCents: 0,
  });
  findPlanStub.onSecondCall().resolves({
    ...mockedPlan,
    baseCostPerBillingIntervalCents: 0,
    perSeatCostPerBillingIntervalCents: 0,
  });
  const newCalaSubscriptionId = uuid.v4();
  sandbox().stub(uuid, "v4").returns(newCalaSubscriptionId);

  try {
    await upgradeTeamSubscription(trxStub, {
      planId: "a-plan-id",
      teamId: "a-team-id",
      userId: "a-user-id",
      stripeCardToken: null,
    });
  } catch (err) {
    t.fail("should not fail");
  }

  t.equal(
    createPaymentMethodStub.callCount,
    0,
    "createPaymentMethod is not called for free plan"
  );
  t.equal(
    createSubscriptionFlowStub.callCount,
    0,
    "doesn't call create subscription flow"
  );
  t.deepEqual(
    createCalaSubscriptionStub.args,
    [
      [
        {
          cancelledAt: null,
          id: newCalaSubscriptionId,
          isPaymentWaived: false,
          paymentMethodId: mockedCalaSubscription.paymentMethodId, // called with old subscription payment method
          planId: "a-plan-id",
          stripeSubscriptionId: "a-stripe-subscription-id",
          userId: null,
          teamId: "a-team-id",
        },
        trxStub,
      ],
    ],
    "create new CALA subscrpition with payment method id from old subscription as for free plan we don't create new payment method"
  );

  t.deepEqual(
    upgradeStripeSubscriptionStub.args,
    [
      [
        {
          subscription: mockedCalaSubscription,
          newPlan: {
            ...mockedPlan,
            baseCostPerBillingIntervalCents: 0,
            perSeatCostPerBillingIntervalCents: 0,
          },
          seatCount: 3,
          stripeSourceId: null,
        },
      ],
    ],
    "calls upgrade stripe subscription with null stripeSourceId as no payment method is created for free plan"
  );
});

test("upgradeTeamSubscription: throws error if plan doesn't have stripe prices", async (t: Test) => {
  const {
    trxStub,
    findPlanStub,
    createPaymentMethodStub,
    createSubscriptionFlowStub,
    createCalaSubscriptionStub,
    upgradeStripeSubscriptionStub,
  } = await setup();
  findPlanStub.onFirstCall().resolves({ ...mockedPlan, stripePrices: [] });

  try {
    await upgradeTeamSubscription(trxStub, {
      planId: "a-plan-id",
      teamId: "a-team-id",
      userId: "a-user-id",
      stripeCardToken: "a-stripe-card-token",
    });
    t.fail("should not succeed");
  } catch (err) {
    t.equal(
      err.message,
      "Plan with id a-plan-id doesn't have Stripe prices",
      "throws correct error message when plan doesn't have stripe prices"
    );
  }

  t.equal(
    createPaymentMethodStub.callCount,
    0,
    "does not create Stripe source or new payment method"
  );
  t.equal(
    createSubscriptionFlowStub.callCount,
    0,
    "doesn't call create subscription flow"
  );
  t.equal(
    createCalaSubscriptionStub.callCount,
    0,
    "does not create new Cala subscription"
  );
  t.equal(
    upgradeStripeSubscriptionStub.callCount,
    0,
    "does not make any requests to Stripe"
  );
});

test("upgradeTeamSubscription: creates subscription if there is no active team subscription", async (t: Test) => {
  const {
    trxStub,
    findActiveTeamSubscriptionStub,
    createSubscriptionFlowStub,
    createCalaSubscriptionStub,
    upgradeStripeSubscriptionStub,
  } = await setup();
  findActiveTeamSubscriptionStub.resolves();
  createSubscriptionFlowStub.resolves(mockedCalaSubscription);

  const createdSubscription = await upgradeTeamSubscription(trxStub, {
    planId: "a-plan-id",
    teamId: "a-team-id",
    userId: "a-user-id",
    stripeCardToken: "a-stripe-card-token",
  });

  t.equal(createSubscriptionFlowStub.callCount, 1, "calls create subscription");
  t.deepEqual(
    createSubscriptionFlowStub.args,
    [
      [
        trxStub,
        {
          planId: "a-plan-id",
          teamId: "a-team-id",
          userId: "a-user-id",
          stripeCardToken: "a-stripe-card-token",
          isPaymentWaived: false,
        },
      ],
    ],
    "calls create subscription with correct args"
  );

  t.deepEqual(
    createdSubscription,
    mockedCalaSubscription,
    "upgrade response with the subscription from create subscription flow"
  );

  t.equal(
    createCalaSubscriptionStub.callCount,
    0,
    "does not create new Cala subscription"
  );
  t.equal(
    upgradeStripeSubscriptionStub.callCount,
    0,
    "does not make any requests to Stripe"
  );
});

test("upgradeTeamSubscription: throws an error when tries to upgrade to a paid plan without stripeCardToken", async (t: Test) => {
  const {
    trxStub,
    createPaymentMethodStub,
    createSubscriptionFlowStub,
    createCalaSubscriptionStub,
    upgradeStripeSubscriptionStub,
  } = await setup();

  try {
    await upgradeTeamSubscription(trxStub, {
      planId: "a-plan-id",
      teamId: "a-team-id",
      userId: "a-user-id",
      stripeCardToken: null,
    });
    t.fail("should not succeed");
  } catch (err) {
    t.equal(err instanceof InvalidDataError, true);
    t.equal(
      err.message,
      "Missing stripe card token",
      "throws correct error message when tries to upgrade to a paid plan without stripeCardToken"
    );
  }

  t.equal(
    createPaymentMethodStub.callCount,
    0,
    "does not create Stripe source or new payment method"
  );
  t.equal(
    createSubscriptionFlowStub.callCount,
    0,
    "doesn't call create subscription flow"
  );
  t.equal(
    createCalaSubscriptionStub.callCount,
    0,
    "does not create new Cala subscription"
  );
  t.equal(
    upgradeStripeSubscriptionStub.callCount,
    0,
    "does not make any requests to Stripe"
  );
});

test("upgradeTeamSubscription: successful call stripe subscription upgrade and responses with new cala subscription", async (t: Test) => {
  const {
    trxStub,
    findPlanStub,
    findActiveTeamSubscriptionStub,
    createPaymentMethodStub,
    countBilledUsersTeamUsersStub,
    upgradeStripeSubscriptionStub,
    updateCalaSubscriptionStub,
    createSubscriptionFlowStub,
    createCalaSubscriptionStub,
  } = await setup();

  const cancelledDate = new Date();
  sandbox().useFakeTimers(cancelledDate);

  const newCalaSubscriptionId = uuid.v4();
  sandbox().stub(uuid, "v4").returns(newCalaSubscriptionId);
  createCalaSubscriptionStub.resolves({
    ...mockedCalaSubscription,
    id: newCalaSubscriptionId,
  });

  const newSubscription = await upgradeTeamSubscription(trxStub, {
    planId: "a-plan-id",
    teamId: "a-team-id",
    userId: "a-user-id",
    stripeCardToken: "a-stripe-card-token",
  });

  t.deepEqual(
    newSubscription,
    {
      ...mockedCalaSubscription,
      id: newCalaSubscriptionId,
    },
    "upgradeTeamSubscription response with new subscription created by subscriptionsDAO.create"
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
    createPaymentMethodStub.args,
    [[{ trx: trxStub, userId: "a-user-id", token: "a-stripe-card-token" }]],
    "calls create payment method  with correct args"
  );
  t.deepEqual(
    countBilledUsersTeamUsersStub.args,
    [[trxStub, "a-team-id"]],
    "calls method to get count of non viewers team users with correct team id"
  );
  t.deepEqual(
    upgradeStripeSubscriptionStub.args,
    [
      [
        {
          subscription: mockedCalaSubscription,
          newPlan: mockedPlan,
          seatCount: 3,
          stripeSourceId: "a-stripe-source-id",
        },
      ],
    ],
    "calls upgrade stripe subscription with correct args"
  );

  t.deepEqual(
    updateCalaSubscriptionStub.args,
    [
      [
        "a-subscription-id",
        {
          cancelledAt: cancelledDate,
        },
        trxStub,
      ],
    ],
    "cancel subscrpition with correct subscription id and cancelledAt date"
  );

  t.equal(
    createSubscriptionFlowStub.callCount,
    0,
    "doesn't call create subscription flow"
  );

  t.deepEqual(
    createCalaSubscriptionStub.args,
    [
      [
        {
          cancelledAt: null,
          id: newCalaSubscriptionId,
          isPaymentWaived: false,
          paymentMethodId: "a-new-payment-method-id",
          planId: "a-plan-id",
          stripeSubscriptionId: "a-stripe-subscription-id",
          userId: null,
          teamId: "a-team-id",
        },
        trxStub,
      ],
    ],
    "create new CALA subscrpition with correct data from previous subscription and new id"
  );
});
