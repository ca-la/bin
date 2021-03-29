import tape from "tape";
import { sandbox, test } from "../../test-helpers/fresh";
import {
  redeemReferralCode,
  InvalidReferralCodeError,
  grantSubscriptionCredits,
} from "./service";
import * as types from "./types";
import dao from "./dao";
import db = require("../../services/db");
import createUser = require("../../test-helpers/create-user");
import { BillingInterval } from "../plans";
import * as CreditsDAO from "../credits/dao";
import { REFERRED_USER_SIGNUP_CENTS } from "./grant-checkout-credits";
import { daysToMs } from "../../services/time-conversion";

test("redeemReferralCode", async (t: tape.Test) => {
  const { user: referrer } = await createUser({ withSession: false });
  const { user: referred } = await createUser({ withSession: false });

  const trx = await db.transaction();

  const created = await redeemReferralCode({
    trx,
    referredUserId: referred.id,
    referralCode: referrer.referralCode,
  });

  t.equal(created.referredUserId, referred.id);
  t.equal(created.referringUserId, referrer.id);

  const referredCredits = await CreditsDAO.getCreditAmount(referred.id, trx);
  t.equal(
    referredCredits,
    REFERRED_USER_SIGNUP_CENTS,
    "Referred user has credits after signup"
  );

  trx.rollback();
});

test("redeemReferralCode with invalid code", async (t: tape.Test) => {
  const { user: referred } = await createUser({ withSession: false });

  const trx = await db.transaction();

  try {
    await redeemReferralCode({
      trx,
      referredUserId: referred.id,
      referralCode: "veryfakecode",
    });
    t.fail("Shouldn't get here");
  } catch (err) {
    t.equal(err instanceof InvalidReferralCodeError, true);
    t.equal(err.message, '"veryfakecode" is not a valid referral code');
  } finally {
    trx.rollback();
  }
});

test("grantSubscriptionCredits", async (t: tape.Test) => {
  const now = new Date();

  sandbox()
    .stub(types, "isReferralRedemptionRowWithSubscriptionAndPlan")
    .returns(true);

  interface TestCase {
    title: string;
    referralRedemptionRow: {
      billing_interval: BillingInterval;
      subscription_created_at: Date | null;
      latest_subscription_bonus_issued_at: Date | null;
      base_cost_per_billing_interval_cents: number;
    };
    addCreditCalled: number;
  }

  const testCases: TestCase[] = [
    {
      title: "Annual, a year ago",
      referralRedemptionRow: {
        billing_interval: BillingInterval.ANNUALLY,
        subscription_created_at: new Date(now.getTime() - daysToMs(367)),
        latest_subscription_bonus_issued_at: null,
        base_cost_per_billing_interval_cents: 1,
      },
      addCreditCalled: 1,
    },
    {
      title: "Annual, a year ago with free plan",
      referralRedemptionRow: {
        billing_interval: BillingInterval.ANNUALLY,
        subscription_created_at: new Date(now.getTime() - daysToMs(367)),
        latest_subscription_bonus_issued_at: null,
        base_cost_per_billing_interval_cents: 0,
      },
      addCreditCalled: 0,
    },
    {
      title: "Annual, 2 years ago",
      referralRedemptionRow: {
        billing_interval: BillingInterval.ANNUALLY,
        subscription_created_at: new Date(now.getTime() - daysToMs(2 * 367)),
        latest_subscription_bonus_issued_at: null,
        base_cost_per_billing_interval_cents: 1,
      },

      // still one record, as the referral bonus programm lasts one year
      addCreditCalled: 1,
    },
    {
      // In real world, this shouldn't be returned by getReferralRedemptionRowsWithUnpaidSubscriptionBonus
      // but let's make sure grantSubscriptionCredits can handle it
      title: "Annual, issued more than a year ago",
      referralRedemptionRow: {
        billing_interval: BillingInterval.ANNUALLY,
        subscription_created_at: new Date(now.getTime() - daysToMs(363)),
        latest_subscription_bonus_issued_at: new Date(
          now.getTime() - daysToMs(362)
        ),
        base_cost_per_billing_interval_cents: 1,
      },
      addCreditCalled: 0,
    },
    {
      title: "Monthly paid plan, more than 2 months ago",
      referralRedemptionRow: {
        billing_interval: BillingInterval.MONTHLY,
        subscription_created_at: new Date(now.getTime() - daysToMs(2 * 31 + 1)),
        latest_subscription_bonus_issued_at: null,
        base_cost_per_billing_interval_cents: 1,
      },
      addCreditCalled: 3,
    },
    {
      title: "Monthly paid plan, more than 2 months ago, issued 2 months ago",
      referralRedemptionRow: {
        billing_interval: BillingInterval.MONTHLY,
        subscription_created_at: new Date(now.getTime() - daysToMs(2 * 31 + 1)),
        latest_subscription_bonus_issued_at: new Date(
          now.getTime() - daysToMs(2 * 31)
        ),
        base_cost_per_billing_interval_cents: 1,
      },
      addCreditCalled: 2,
    },
    {
      title: "Monthly paid plan, 2 years ago ago",
      referralRedemptionRow: {
        billing_interval: BillingInterval.MONTHLY,
        subscription_created_at: new Date(now.getTime() - daysToMs(2 * 367)),
        latest_subscription_bonus_issued_at: null,
        base_cost_per_billing_interval_cents: 1,
      },
      addCreditCalled: 12,
    },
  ];

  sandbox().stub(dao, "update");
  const getRedemptionsStub = sandbox().stub(
    dao,
    "getReferralRedemptionRowsWithUnpaidSubscriptionBonus"
  );

  const addCreditStub = sandbox().stub(CreditsDAO, "addCredit");

  const trx = await db.transaction();
  try {
    for (const testCase of testCases) {
      addCreditStub.reset();
      getRedemptionsStub.returns([
        {
          ...testCase.referralRedemptionRow,
          per_seat_cost_per_billing_interval_cents: 0,
        },
      ]);
      await grantSubscriptionCredits(trx);
      t.equal(
        addCreditStub.args.length,
        testCase.addCreditCalled,
        testCase.title
      );
    }
    await trx.rollback();
  } catch (err) {
    await trx.rollback();
    throw err;
  }
});
