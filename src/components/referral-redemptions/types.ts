import { isSubscriptionRow, SubscriptionRow } from "../subscriptions";
import { PlanDbRow, planDbRowSchema } from "../plans";
import adapter from "./adapter";

export interface ReferralRedemption {
  id: string;
  createdAt: Date;
  referringUserId: string;
  referredUserId: string;

  // For a ("referring") user who has referred someone, the credit transaction
  // indicating if/when they have been compensated for first checkout payments made by
  // their referral.
  referringUserCheckoutCreditId: string | null;
}

export interface ReferralRedemptionRow {
  id: string;
  created_at: Date;
  referring_user_id: string;
  referred_user_id: string;
  referring_user_checkout_credit_id: string | null;
}

export interface ReferralRedemptionRowWithStripeSubscriptionId
  extends ReferralRedemptionRow {
  stripe_subscription_id: string;
}

export interface ReferralRedemptionRowWithSubscriptionAndPlan
  extends ReferralRedemptionRow,
    SubscriptionRow,
    PlanDbRow {
  subscription_created_at: Date;
  referral_redemption_id: string;
  team_users_count: number;
}

export function isReferralRedemptionRowWithSubscriptionAndPlan(
  data: any
): data is ReferralRedemptionRowWithSubscriptionAndPlan {
  const parsingResult = planDbRowSchema.safeParse(data);
  return (
    !Number.isNaN(data.team_users_count) &&
    parsingResult.success &&
    adapter.isRow(data) &&
    isSubscriptionRow(data)
  );
}
