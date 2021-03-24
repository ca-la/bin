export interface ReferralRedemption {
  id: string;
  createdAt: Date;
  referringUserId: string;
  referredUserId: string;

  // For a ("referring") user who has referred someone, the credit transaction
  // indicating if/when they have been compensated for checkout payments made by
  // their referral.
  referringUserCheckoutCreditId: string | null;
  referredUserSignupCreditId: string | null;
}

export interface ReferralRedemptionRow {
  id: string;
  created_at: Date;
  referring_user_id: string;
  referred_user_id: string;
  referring_user_checkout_credit_id: string | null;
  referred_user_signup_credit_id: string | null;
}
