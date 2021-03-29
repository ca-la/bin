import { buildDao } from "../../services/cala-component/cala-dao";
import { ReferralRedemption, ReferralRedemptionRow } from "./types";
import adapter from "./adapter";
import { Transaction } from "knex";
import { BillingInterval } from "../plans";
import { TeamUserRole, FREE_TEAM_USER_ROLES } from "../team-users";

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

  async getReferralRedemptionRowsWithUnpaidSubscriptionBonus(trx: Transaction) {
    const now = new Date();
    const monthAgo = new Date(new Date().setMonth(now.getMonth() - 1));
    const yearAgo = new Date(new Date().setFullYear(now.getFullYear() - 1));

    // Obtain an update lock so that multiple parallel calls don't grant double credits
    await trx.raw(
      `
      select * from referral_redemptions
      where latest_subscription_bonus_issued_at is null or latest_subscription_bonus_issued_at < ?
      for update;
    `,
      [yearAgo]
    );

    return await trx("subscriptions as s")
      .select(
        "s.*",
        "rr.*",
        "p.*",
        "s.created_at as subscription_created_at",
        "rr.id as referral_redemption_id",
        trx
          .select(trx.raw("cast(count(*) as int)"))
          .from("team_users")
          .whereNotIn("role", FREE_TEAM_USER_ROLES)
          .andWhere("deleted_at", null)
          .andWhereRaw("team_id = s.team_id")
          .as("team_users_count")
      )
      .distinctOn("rr.id")
      .whereRaw(
        `(s.cancelled_at is null or s.cancelled_at >= ?)
          and tu.role=?
          and (
            (rr.latest_subscription_bonus_issued_at is null)
            or (p.billing_interval = ? and rr.latest_subscription_bonus_issued_at <= ?)
            or (p.billing_interval = ? and rr.latest_subscription_bonus_issued_at <= ?)
          )`,
        [
          now,
          TeamUserRole.OWNER,
          BillingInterval.MONTHLY,
          monthAgo,
          BillingInterval.ANNUALLY,
          yearAgo,
        ]
      )
      .innerJoin("team_users as tu", "s.team_id", "tu.team_id")
      .innerJoin(
        "referral_redemptions as rr",
        "tu.user_id",
        "rr.referred_user_id"
      )
      .innerJoin("plans as p", "s.plan_id", "p.id")
      .orderBy("rr.id", "asc");
  },
};

export default dao;
