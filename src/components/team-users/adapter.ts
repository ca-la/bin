import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { dataAdapter as userAdapter } from "../users/domain-object";
import { TeamUserDb, TeamUserDbRow, TeamUserRow, TeamUser } from "./types";

function rawEncode(row: TeamUserDbRow): TeamUserDb {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    teamId: row.team_id,
    role: row.role,
  } as TeamUserDb;
}

function encode(row: TeamUserRow): TeamUser {
  return {
    ...rawEncode(row),
    user: row.user ? userAdapter.parse(row.user) : null,
  } as TeamUser;
}

function rawDecode(data: TeamUserDb): TeamUserDbRow {
  return {
    id: data.id,
    user_id: data.userId,
    user_email: data.userEmail,
    team_id: data.teamId,
    role: data.role,
  } as TeamUserDbRow;
}

function decode(data: TeamUser): TeamUserRow {
  return {
    ...rawDecode(data),
    user: data.user ? userAdapter.toDb(data.user) : null,
  } as TeamUserRow;
}

export const rawAdapter = buildAdapter({
  domain: "TeamUserDb" as const,
  encodeTransformer: rawEncode,
  decodeTransformer: rawDecode,
  requiredProperties: ["id", "teamId", "userId", "userEmail", "role"],
});

export default buildAdapter({
  domain: "TeamUser" as const,
  encodeTransformer: encode,
  decodeTransformer: decode,
  requiredProperties: ["id", "teamId", "userId", "userEmail", "role", "user"],
});
