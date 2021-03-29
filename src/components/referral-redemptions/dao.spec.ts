import tape from "tape";
import { pick } from "lodash";
import { test } from "../../test-helpers/fresh";
import ReferralRedemptionsDAO from "./dao";
import {
  ReferralRedemption,
  ReferralRedemptionRowWithSubscriptionAndPlan,
} from "./types";
import db = require("../../services/db");
import { daysToMs } from "../../services/time-conversion";
import createUser = require("../../test-helpers/create-user");
import generatePlan from "../../test-helpers/factories/plan";
import { generateTeam } from "../../test-helpers/factories/team";
import { BillingInterval } from "../plans";
import { Transaction } from "knex";
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
    latestSubscriptionBonusIssuedAt: null,
    referredUserSignupCreditId: null,
  };

  const trx = await db.transaction();

  const created = await ReferralRedemptionsDAO.create(trx, data);
  t.deepEqual(created, data);

  const found = await ReferralRedemptionsDAO.findById(trx, data.id);
  t.deepEqual(found, data);

  trx.rollback();
});

test("getReferralRedemptionRowsWithUnpaidSubscriptionBonus filtering", async (t: tape.Test) => {
  const trx = await db.transaction();

  try {
    const monthPlan = await generatePlan(trx, {
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 100,
    });
    const annualPlan = await generatePlan(trx, {
      billingInterval: BillingInterval.ANNUALLY,
      monthlyCostCents: 100,
    });
    const { user: referrer } = await createUser({ withSession: false });

    interface SetupOptions {
      planId: string;
      cancelledAt: Date | null;
      latestSubscriptionBonusIssuedAt: Date | null;
      teamUserRole?: TeamUserRole;
    }
    async function setup(innerTrx: Transaction, options: SetupOptions) {
      const {
        planId,
        cancelledAt,
        latestSubscriptionBonusIssuedAt,
        teamUserRole,
      } = options;
      const { user: referred } = await createUser({ withSession: false });

      const { team } = await generateTeam(
        referred.id,
        {},
        {
          role: teamUserRole || TeamUserRole.OWNER,
        }
      );

      await SubscriptionsDAO.create(
        {
          id: uuid.v4(),
          cancelledAt,
          planId,
          paymentMethodId: null,
          stripeSubscriptionId: null,
          isPaymentWaived: false,
          userId: null,
          teamId: team.id,
        },
        innerTrx
      );

      return await ReferralRedemptionsDAO.create(innerTrx, {
        id: uuid.v4(),
        createdAt: new Date(),
        referredUserId: referred.id,
        referringUserId: referrer.id,
        referringUserCheckoutCreditId: null,
        latestSubscriptionBonusIssuedAt,
        referredUserSignupCreditId: null,
      });
    }

    interface TestCase {
      title: string;
      setupOptions: SetupOptions[];
      expectedIndexes: number[];
    }
    const now = new Date();
    const testCases: TestCase[] = [
      {
        title: "no redemptions",
        setupOptions: [],
        expectedIndexes: [],
      },
      {
        title: "referred user isn't team owner",
        setupOptions: [
          {
            planId: monthPlan.id,
            cancelledAt: null,
            latestSubscriptionBonusIssuedAt: null,
            teamUserRole: TeamUserRole.ADMIN,
          },
        ],
        expectedIndexes: [],
      },
      {
        title: "month plans",
        setupOptions: [
          {
            planId: monthPlan.id,
            cancelledAt: null,
            latestSubscriptionBonusIssuedAt: null,
          },
          {
            planId: monthPlan.id,
            cancelledAt: null,
            // issued less than a month ago
            latestSubscriptionBonusIssuedAt: new Date(
              now.getTime() - daysToMs(27)
            ),
          },
          {
            planId: monthPlan.id,
            cancelledAt: null,
            // issued more than a month ago
            latestSubscriptionBonusIssuedAt: new Date(
              now.getTime() - daysToMs(35)
            ),
          },
          {
            planId: monthPlan.id,
            cancelledAt: new Date(now.getTime() - 60 * 1000),
            latestSubscriptionBonusIssuedAt: null,
          },
        ],
        expectedIndexes: [0, 2],
      },
      {
        title: "annual plans",
        setupOptions: [
          {
            planId: annualPlan.id,
            cancelledAt: null,
            latestSubscriptionBonusIssuedAt: null,
          },
          {
            planId: annualPlan.id,
            cancelledAt: null,
            // issued less than a year ago
            latestSubscriptionBonusIssuedAt: new Date(
              now.getTime() - daysToMs(364)
            ),
          },
          {
            planId: annualPlan.id,
            cancelledAt: null,
            // issued more than a year ago
            latestSubscriptionBonusIssuedAt: new Date(
              now.getTime() - daysToMs(367)
            ),
          },
          {
            planId: annualPlan.id,
            cancelledAt: new Date(now.getTime() - 60 * 1000),
            latestSubscriptionBonusIssuedAt: null,
          },
        ],
        expectedIndexes: [0, 2],
      },
    ];

    for (const testCase of testCases) {
      const innerTrx = await trx.transaction();
      const redemptions = await Promise.all(
        testCase.setupOptions.map((options: SetupOptions) =>
          setup(innerTrx, options)
        )
      );
      const rows = await ReferralRedemptionsDAO.getReferralRedemptionRowsWithUnpaidSubscriptionBonus(
        trx
      );
      const expectedIds = testCase.expectedIndexes.map(
        (index: number) => redemptions[index].id
      );
      const actualIds = rows.map(
        (row: ReferralRedemptionRowWithSubscriptionAndPlan) =>
          row.referral_redemption_id
      );
      expectedIds.sort();
      actualIds.sort();
      t.deepEqual(actualIds, expectedIds, testCase.title);
      innerTrx.rollback();
    }
  } catch (err) {
    trx.rollback();
    throw err;
  }
  trx.rollback();
});

test("getReferralRedemptionRowsWithUnpaidSubscriptionBonus", async (t: tape.Test) => {
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
  const subscription = await SubscriptionsDAO.create(
    {
      id: uuid.v4(),
      cancelledAt: null,
      planId: plan.id,
      paymentMethodId: null,
      stripeSubscriptionId: null,
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
    latestSubscriptionBonusIssuedAt: null,
    referredUserSignupCreditId: null,
  });

  const rows = await ReferralRedemptionsDAO.getReferralRedemptionRowsWithUnpaidSubscriptionBonus(
    trx
  );
  trx.rollback();

  t.deepEqual(
    pick(
      rows[0],
      "billing_interval",
      "subscription_created_at",
      "latest_subscription_bonus_issued_at",
      "monthly_cost_cents",
      "referred_user_id",
      "referring_user_id"
    ),
    {
      billing_interval: BillingInterval.MONTHLY,
      subscription_created_at: subscription.createdAt,
      latest_subscription_bonus_issued_at: null,
      monthly_cost_cents: "500",
      referred_user_id: referred.id,
      referring_user_id: referrer.id,
    }
  );
});
