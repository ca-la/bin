import { Transaction } from "knex";
import { buildDao } from "../../services/cala-component/cala-dao";
import {
  ReferralRedemption,
  ReferralRedemptionRow,
  ReferralRedemptionRowWithStripeSubscriptionId,
} from "./types";
import adapter from "./adapter";
import { TeamUserRole } from "../team-users";

const dao = {
  ...buildDao<ReferralRedemption, ReferralRedemptionRow>(
    "ReferralRedemption",
    "referral_redemptions",
    adapter,
    {
      orderColumn: "created_at",
      excludeDeletedAt: false,
    }
  ),

  async findByStripeSubscriptionIds(
    trx: Transaction,
    stripeSubscriptionIds: string[]
  ): Promise<ReferralRedemptionRowWithStripeSubscriptionId[]> {
    const now = new Date();
    return await trx("subscriptions as s")
      .select("rr.*", "s.stripe_subscription_id")
      .whereIn("s.stripe_subscription_id", stripeSubscriptionIds)
      .distinctOn("s.id")
      .andWhereRaw(
        `(s.cancelled_at is null or s.cancelled_at >= ?) and tu.role=?`,
        [now, TeamUserRole.OWNER]
      )
      .innerJoin("team_users as tu", "s.team_id", "tu.team_id")
      .innerJoin(
        "referral_redemptions as rr",
        "tu.user_id",
        "rr.referred_user_id"
      )
      .orderBy("s.id", "asc");
  },
};

export default dao;
