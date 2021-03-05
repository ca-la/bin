import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { ReferralRedemption, ReferralRedemptionRow } from "./types";

export default buildAdapter<ReferralRedemption, ReferralRedemptionRow>({
  domain: "ReferralRedemption",
  requiredProperties: ["id", "createdAt", "referringUserId", "referredUserId"],
  encodeTransformer: (row: ReferralRedemptionRow): ReferralRedemption => ({
    id: row.id,
    createdAt: row.created_at,
    referringUserId: row.referring_user_id,
    referredUserId: row.referred_user_id,
  }),
  decodeTransformer: (data: ReferralRedemption): ReferralRedemptionRow => ({
    id: data.id,
    created_at: data.createdAt,
    referring_user_id: data.referringUserId,
    referred_user_id: data.referredUserId,
  }),
});
