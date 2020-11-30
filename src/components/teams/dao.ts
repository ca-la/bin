import Knex, { QueryBuilder } from "knex";
import {
  buildDao,
  identity,
  QueryModifier,
} from "../../services/cala-component/cala-dao";
import { TeamDb, TeamDbRow } from "./types";
import { rawAdapter } from "./adapter";

const TABLE_NAME = "teams";

export const standardDao = buildDao<TeamDb, TeamDbRow>(
  "Team",
  TABLE_NAME,
  rawAdapter,
  {
    orderColumn: "created_at",
  }
);

async function findUnpaidTeams(
  trx: Knex.Transaction,
  modifier: QueryModifier = (q: Knex.QueryBuilder) => q
) {
  const rows = await trx(TABLE_NAME)
    .distinct()
    .select("teams.*")
    .join("design_events", "teams.id", "design_events.target_team_id")
    .join("pricing_bids", "design_events.bid_id", "pricing_bids.id")
    .leftJoin(
      "partner_payout_logs",
      "pricing_bids.id",
      "partner_payout_logs.bid_id"
    )
    .where({ "design_events.type": "ACCEPT_SERVICE_BID" })
    .whereNotIn(
      "pricing_bids.id",
      trx("design_events").select("bid_id").where({ type: "REMOVE_PARTNER" })
    )
    .groupBy(["pricing_bids.id", "teams.id", "pricing_bids.bid_price_cents"])
    .having(
      trx.raw(
        "pricing_bids.bid_price_cents > coalesce(sum(partner_payout_logs.payout_amount_cents), 0)"
      )
    )
    .modify(modifier);

  return rawAdapter.fromDbArray(rows);
}

async function findByUser(
  trx: Knex.Transaction,
  userId: string,
  filter: Partial<TeamDb> = {},
  modifier: QueryModifier = identity
) {
  return standardDao.find(trx, filter, (query: QueryBuilder) =>
    modifier(query)
      .join("team_users", "team_users.team_id", "teams.id")
      .where({ "team_users.user_id": userId, "team_users.deleted_at": null })
  );
}

export default {
  findUnpaidTeams,
  findByUser,
  ...standardDao,
};
