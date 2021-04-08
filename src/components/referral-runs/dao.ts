import { buildDao } from "../../services/cala-component/cala-dao";
import { ReferralRun, ReferralRunRow } from "./types";
import adapter from "./adapter";

const TABLE_NAME = "referral_runs";

export default buildDao<ReferralRun, ReferralRunRow>(
  "ReferralRun",
  TABLE_NAME,
  adapter,
  {
    orderColumn: "created_at",
    orderDirection: "DESC",
    excludeDeletedAt: false,
  }
);
