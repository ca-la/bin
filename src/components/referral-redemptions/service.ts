import { Transaction } from "knex";
import uuid from "node-uuid";
import { BillingInterval } from "../plans";
import * as CreditsDAO from "../credits/dao";
import { isReferralRedemptionRowWithSubscriptionAndPlan } from "./types";
import ReferralRedemptionsDAO from "./dao";
import * as UsersDAO from "../users/dao";

import {
  REFERRED_USER_SIGNUP_CENTS,
  REFERRING_USER_SUBSCRIPTION_SHARE_PERCENTS,
} from "./grant-checkout-credits";

export class InvalidReferralCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "InvalidReferralCodeError";
  }
}

interface Options {
  trx: Transaction;
  referredUserId: string;
  referralCode: string;
}

export async function redeemReferralCode({
  trx,
  referredUserId,
  referralCode,
}: Options) {
  const referringUser = await UsersDAO.findByReferralCode(referralCode);

  if (!referringUser) {
    throw new InvalidReferralCodeError(
      `"${referralCode}" is not a valid referral code`
    );
  }

  const now = new Date();
  const creditId = await CreditsDAO.addCredit(
    {
      description: `Referral credit for registration`,
      amountCents: REFERRED_USER_SIGNUP_CENTS,
      createdBy: referredUserId,
      givenTo: referredUserId,
      expiresAt: new Date(now.setFullYear(now.getFullYear() + 1)),
    },
    trx
  );

  return await ReferralRedemptionsDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    referredUserId,
    referringUserId: referringUser.id,
    referringUserCheckoutCreditId: null,
    latestSubscriptionBonusIssuedAt: null,
    referredUserSignupCreditId: creditId,
  });
}

export async function grantSubscriptionCredits(trx: Transaction) {
  const now = new Date();
  const rows = await ReferralRedemptionsDAO.getReferralRedemptionRowsWithUnpaidSubscriptionBonus(
    trx
  );

  let total = 0;
  for (const row of rows) {
    if (!isReferralRedemptionRowWithSubscriptionAndPlan(row)) {
      throw new Error(`Invalid row obtained from db: ${JSON.stringify(row)}`);
    }

    const bonusPeriodLimit = new Date(row.subscription_created_at);
    bonusPeriodLimit.setFullYear(row.subscription_created_at.getFullYear() + 1);

    const dateLimit = now < bonusPeriodLimit ? now : bonusPeriodLimit;

    const dateAmountPairs: { date: Date; amount: number }[] = [];
    switch (row.billing_interval) {
      case BillingInterval.ANNUALLY: {
        for (
          const d = row.subscription_created_at;
          d < dateLimit;
          d.setFullYear(d.getFullYear() + 1)
        ) {
          if (
            row.latest_subscription_bonus_issued_at === null ||
            d > row.latest_subscription_bonus_issued_at
          ) {
            dateAmountPairs.push({
              date: new Date(d),
              amount:
                Math.floor(
                  (Number(row.monthly_cost_cents) *
                    REFERRING_USER_SUBSCRIPTION_SHARE_PERCENTS) /
                    100
                ) * 12,
            });
          }
        }
        break;
      }
      case BillingInterval.MONTHLY: {
        for (
          const d = row.subscription_created_at;
          d < dateLimit;
          d.setMonth(d.getMonth() + 1)
        ) {
          if (
            row.latest_subscription_bonus_issued_at === null ||
            d > row.latest_subscription_bonus_issued_at
          ) {
            dateAmountPairs.push({
              date: new Date(d),
              amount: Math.floor(
                (Number(row.monthly_cost_cents) *
                  REFERRING_USER_SUBSCRIPTION_SHARE_PERCENTS) /
                  100
              ),
            });
          }
        }
        break;
      }
      default:
        throw new Error(
          `Unexpected billing_interval value ${row.billing_interval}`
        );
    }
    for (const { date, amount } of dateAmountPairs) {
      await CreditsDAO.addCredit(
        {
          description: `Referral subscription bonus for ${date.toISOString()}`,
          amountCents: amount,
          createdBy: row.referred_user_id,
          givenTo: row.referring_user_id,
          expiresAt: null,
        },
        trx
      );

      await ReferralRedemptionsDAO.update(trx, row.referral_redemption_id, {
        latestSubscriptionBonusIssuedAt: now,
      });

      total = total + amount;
    }
  }

  return total;
}
