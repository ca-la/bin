import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { TeamDbRow, TeamDb, TeamRow, Team } from "./types";

function rawEncode(row: TeamDbRow): TeamDb {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function rawDecode(data: TeamDb): TeamDbRow {
  return {
    id: data.id,
    title: data.title,
    created_at: data.createdAt,
    deleted_at: data.deletedAt,
  };
}

function encode(row: TeamRow): Team {
  return {
    ...rawEncode(row),
    role: row.role,
  };
}

function decode(data: Team): TeamRow {
  return {
    ...rawDecode(data),
    role: data.role,
  };
}

export const rawAdapter = buildAdapter({
  domain: "Team",
  encodeTransformer: rawEncode,
  decodeTransformer: rawDecode,
  requiredProperties: ["id", "title", "createdAt", "deletedAt"],
});

export default buildAdapter({
  domain: "Team",
  encodeTransformer: encode,
  decodeTransformer: decode,
  requiredProperties: ["id", "title", "createdAt", "deletedAt", "role"],
});
