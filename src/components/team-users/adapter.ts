import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { dataAdapter as userAdapter } from "../users/domain-object";
import { TeamUserDb, TeamUserDbRow, TeamUserRow, TeamUser } from "./types";

function rawEncode(row: TeamUserDbRow): TeamUserDb {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    role: row.role,
  };
}

function encode(row: TeamUserRow): TeamUser {
  return {
    ...rawEncode(row),
    user: userAdapter.parse(row.user),
  };
}

function rawDecode(data: TeamUserDb): TeamUserDbRow {
  return {
    id: data.id,
    user_id: data.userId,
    team_id: data.teamId,
    role: data.role,
  };
}

function decode(data: TeamUser): TeamUserRow {
  return {
    ...rawDecode(data),
    user: userAdapter.toDb(data.user),
  };
}

export const rawAdapter = buildAdapter({
  domain: "TeamUserDb" as const,
  encodeTransformer: rawEncode,
  decodeTransformer: rawDecode,
  requiredProperties: ["id", "teamId", "userId", "role"],
});

export default buildAdapter({
  domain: "TeamUser" as const,
  encodeTransformer: encode,
  decodeTransformer: decode,
  requiredProperties: ["id", "teamId", "userId", "role", "user"],
});
