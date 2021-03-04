import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { UserPageOnboarding, UserPageOnboardingRow } from "./types";

export default buildAdapter<UserPageOnboarding, UserPageOnboardingRow>({
  domain: "UserPageOnboarding",
  requiredProperties: [],
  encodeTransformer: (row: UserPageOnboardingRow): UserPageOnboarding => ({
    id: row.id,
    userId: row.user_id,
    page: row.page,
    viewedAt: row.viewed_at,
  }),
  decodeTransformer: (data: UserPageOnboarding): UserPageOnboardingRow => ({
    id: data.id,
    user_id: data.userId,
    page: data.page,
    viewed_at: data.viewedAt,
  }),
});
