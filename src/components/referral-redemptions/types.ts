import { isSubscriptionRow, SubscriptionRow } from "../subscriptions";
import { PlanDbRow, planDbRowSchema } from "../plans";
import adapter from "./adapter";

export interface ReferralRedemption {
  id: string;
  createdAt: Date;
  referringUserId: string;
  referredUserId: string;

  // For a ("referring") user who has referred someone, the credit transaction
  // indicating if/when they have been compensated for checkout payments made by
  // their referral.
  referringUserCheckoutCreditId: string | null;
  latestSubscriptionBonusIssuedAt: Date | null;
  referredUserSignupCreditId: string | null;
}

export interface ReferralRedemptionRow {
  id: string;
  created_at: Date;
  referring_user_id: string;
  referred_user_id: string;
  referring_user_checkout_credit_id: string | null;
  latest_subscription_bonus_issued_at: Date | null;
  referred_user_signup_credit_id: string | null;
}

export interface ReferralRedemptionRowWithSubscriptionAndPlan
  extends ReferralRedemptionRow,
    SubscriptionRow,
    PlanDbRow {
  subscription_created_at: Date;
  referral_redemption_id: string;
}

export function isReferralRedemptionRowWithSubscriptionAndPlan(
  data: any
): data is ReferralRedemptionRowWithSubscriptionAndPlan {
  const parsingResult = planDbRowSchema.safeParse(data);
  return (
    parsingResult.success && adapter.isRow(data) && isSubscriptionRow(data)
  );
}
