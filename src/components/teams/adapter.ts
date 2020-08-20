import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { TeamRow, Team } from "./types";

function encode(row: TeamRow): Team {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function decode(data: Team): TeamRow {
  return {
    id: data.id,
    title: data.title,
    created_at: data.createdAt,
    deleted_at: data.deletedAt,
  };
}

export default buildAdapter({
  domain: "Team",
  encodeTransformer: encode,
  decodeTransformer: decode,
  requiredProperties: ["id", "title", "createdAt", "deletedAt"],
});
