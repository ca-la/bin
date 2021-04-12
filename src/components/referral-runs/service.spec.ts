import tape from "tape";
import { sandbox, test } from "../../test-helpers/fresh";
import { addReferralSubscriptionBonuses } from "./service";
import db = require("../../services/db");
import createUser = require("../../test-helpers/create-user");

import { generateTeam } from "../../test-helpers/factories/team";
import { TeamUserRole } from "../team-users";
import generatePlan from "../../test-helpers/factories/plan";
import { BillingInterval } from "../plans";
import * as SubscriptionsDAO from "../subscriptions/dao";
import uuid from "node-uuid";
import {
  ReferralRedemptionsDAO,
  REFERRING_USER_SUBSCRIPTION_SHARE_PERCENTS,
} from "../referral-redemptions";
import ReferralRunsDAO from "./dao";
import * as StripeService from "../../services/stripe/service";

test("addReferralSubscriptionBonuses", async (t: tape.Test) => {
  const { user: referrer } = await createUser({ withSession: false });
  const { user: referred } = await createUser({ withSession: false });

  const { team } = await generateTeam(
    referred.id,
    {},
    {
      role: TeamUserRole.OWNER,
    }
  );

  const trx = await db.transaction();
  const plan = await generatePlan(trx, {
    billingInterval: BillingInterval.MONTHLY,
    monthlyCostCents: 500,
  });
  await SubscriptionsDAO.create(
    {
      id: uuid.v4(),
      cancelledAt: null,
      planId: plan.id,
      paymentMethodId: null,
      stripeSubscriptionId: "stripe-subscription-1",
      isPaymentWaived: false,
      userId: null,
      teamId: team.id,
    },
    trx
  );

  await ReferralRedemptionsDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    referredUserId: referred.id,
    referringUserId: referrer.id,
    referringUserCheckoutCreditId: null,
  });

  await ReferralRunsDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    latestStripeInvoiceId: "in_1",
  });

  const paymentTotal = 1000;
  const created = Math.round(new Date().getTime() / 1000);
  const findSubscriptionsStub = sandbox()
    .stub(StripeService, "fetchInvoicesFrom")
    .resolves([
      {
        id: "in_2",
        total: paymentTotal / 2,
        subscription: "stripe-subscription-1",
        created,
      },
      {
        id: "in_3",
        total: paymentTotal * 30,
        subscription: null,
        created,
      },
      {
        id: "in_4",
        total: paymentTotal / 2,
        subscription: "stripe-subscription-1",
        created: created + 364 * 24 * 60 * 60,
      },
      {
        // this record should not count as it is not inside the first year after
        // redemption was created
        id: "in_5",
        total: paymentTotal * 100,
        subscription: "stripe-subscription-1",
        created: created + 367 * 24 * 60 * 60,
      },
    ]);

  const result = await addReferralSubscriptionBonuses(trx);
  t.equal(
    result,
    (paymentTotal * REFERRING_USER_SUBSCRIPTION_SHARE_PERCENTS) / 100,
    "Returned proper amount of credits"
  );

  const existingRuns = await ReferralRunsDAO.count(trx, {});
  t.equal(existingRuns, 2, "created new referral_runs instance");

  t.deepEqual(
    findSubscriptionsStub.args,
    [["in_1"]],
    "Called StripeAPI.findSubscriptions with the latest invoice id"
  );

  findSubscriptionsStub.resolves([]);
  const emptyResult = await addReferralSubscriptionBonuses(trx);

  t.equal(emptyResult, 0, "should return zero if no new subscriptions");

  trx.rollback();
});
