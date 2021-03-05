export interface ReferralRedemption {
  id: string;
  createdAt: Date;
  referringUserId: string;
  referredUserId: string;
}

export interface ReferralRedemptionRow {
  id: string;
  created_at: Date;
  referring_user_id: string;
  referred_user_id: string;
}
