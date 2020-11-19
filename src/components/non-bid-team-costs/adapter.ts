import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { NonBidTeamCost, NonBidTeamCostRow } from "./types";

function encode(row: NonBidTeamCostRow): NonBidTeamCost {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    createdBy: row.created_by,
    teamId: row.team_id,
    cents: Number(row.cents),
    note: row.note,
    category: row.category,
  };
}

export default buildAdapter({
  domain: "Team",
  encodeTransformer: encode,
  requiredProperties: [
    "id",
    "createdAt",
    "updatedAt",
    "createdBy",
    "category",
    "teamId",
  ],
});
