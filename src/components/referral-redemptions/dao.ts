import { buildDao } from "../../services/cala-component/cala-dao";
import { ReferralRedemption, ReferralRedemptionRow } from "./types";
import adapter from "./adapter";

const dao = buildDao<ReferralRedemption, ReferralRedemptionRow>(
  "ReferralRedemption",
  "referral_redemptions",
  adapter,
  {
    orderColumn: "created_at",
    excludeDeletedAt: false,
  }
);

export default dao;
