import { Transaction, QueryBuilder } from "knex";

import { buildDao } from "../../services/cala-component/cala-dao";
import { NonBidTeamCost, NonBidTeamCostRow } from "./types";
import ResourceNotFoundError from "../../errors/resource-not-found";
import adapter from "./adapter";

const TABLE_NAME = "non_bid_team_costs";

export async function deleteById(trx: Transaction, id: string): Promise<void> {
  const now = new Date().toISOString();

  const deletedRows: number = await trx
    .from(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({
      deleted_at: now,
      updated_at: now,
    });

  if (deletedRows === 0) {
    throw new ResourceNotFoundError(
      `Non-bid team cost "${id}" could not be found.`
    );
  }
}

const dao = buildDao<NonBidTeamCost, NonBidTeamCostRow>(
  "NonBidTeamCost",
  "non_bid_team_costs",
  adapter,
  {
    orderColumn: "created_at",
    queryModifier: (query: QueryBuilder) => query.where({ deleted_at: null }),
  }
);

export default {
  ...dao,
  deleteById,
};
