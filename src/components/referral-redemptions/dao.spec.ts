import tape from "tape";
import { pick } from "lodash";
import { test } from "../../test-helpers/fresh";
import ReferralRedemptionsDAO from "./dao";
import {
  ReferralRedemption,
  ReferralRedemptionRowWithStripeSubscriptionId,
} from "./types";
import db = require("../../services/db");
import createUser = require("../../test-helpers/create-user");
import generatePlan from "../../test-helpers/factories/plan";
import { generateTeam } from "../../test-helpers/factories/team";
import { BillingInterval } from "../plans";
import { TeamUserRole } from "../team-users";

import * as SubscriptionsDAO from "../subscriptions/dao";
import uuid from "node-uuid";

test("ReferralRedemption DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user: referrer } = await createUser({ withSession: false });
  const { user: referred } = await createUser({ withSession: false });

  const data: ReferralRedemption = {
    id: "7b83b1be-bcfa-46f3-81eb-6b20437a617b",
    createdAt: new Date(),
    referringUserId: referrer.id,
    referredUserId: referred.id,
    referringUserCheckoutCreditId: null,
  };

  const trx = await db.transaction();

  const created = await ReferralRedemptionsDAO.create(trx, data);
  t.deepEqual(created, data);

  const found = await ReferralRedemptionsDAO.findById(trx, data.id);
  t.deepEqual(found, data);

  trx.rollback();
});

test("findByStripeSubscriptionIds", async (t: tape.Test) => {
  const { user: referrer } = await createUser({ withSession: false });
  const { user: referred } = await createUser({ withSession: false });

  const { team } = await generateTeam(
    referred.id,
    {},
    {
      role: TeamUserRole.OWNER,
    }
  );
  const { team: team2 } = await generateTeam(
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
      stripeSubscriptionId: "stripe-1",
      isPaymentWaived: false,
      userId: null,
      teamId: team.id,
    },
    trx
  );
  await SubscriptionsDAO.create(
    {
      id: uuid.v4(),
      cancelledAt: null,
      planId: plan.id,
      paymentMethodId: null,
      stripeSubscriptionId: "stripe-2",
      isPaymentWaived: false,
      userId: null,
      teamId: team2.id,
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

  const rows = await ReferralRedemptionsDAO.findByStripeSubscriptionIds(trx, [
    "stripe-1",
    "stripe-2",
  ]);
  trx.rollback();

  rows.sort(
    (
      r1: ReferralRedemptionRowWithStripeSubscriptionId,
      r2: ReferralRedemptionRowWithStripeSubscriptionId
    ) => {
      return r1.stripe_subscription_id < r2.stripe_subscription_id ? -1 : 1;
    }
  );
  t.deepEqual(rows.length, 2);

  t.deepEqual(
    pick(
      rows[0],
      "referred_user_id",
      "referring_user_id",
      "stripe_subscription_id"
    ),
    {
      referred_user_id: referred.id,
      referring_user_id: referrer.id,
      stripe_subscription_id: "stripe-1",
    }
  );
  t.deepEqual(
    pick(
      rows[1],
      "referred_user_id",
      "referring_user_id",
      "stripe_subscription_id"
    ),
    {
      referred_user_id: referred.id,
      referring_user_id: referrer.id,
      stripe_subscription_id: "stripe-2",
    }
  );
});
