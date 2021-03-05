import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { ReferralRedemption, ReferralRedemptionRow } from "./types";

export default buildAdapter<ReferralRedemption, ReferralRedemptionRow>({
  domain: "ReferralRedemption",
  requiredProperties: ["id", "createdAt", "referringUserId", "referredUserId"],
});
