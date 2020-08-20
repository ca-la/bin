import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { TeamUser, TeamUserRow } from "./types";

function encode(row: TeamUserRow): TeamUser {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    role: row.role,
  };
}

function decode(data: TeamUser): TeamUserRow {
  return {
    id: data.id,
    user_id: data.userId,
    team_id: data.teamId,
    role: data.role,
  };
}

export default buildAdapter({
  domain: "TeamUser" as const,
  encodeTransformer: encode,
  decodeTransformer: decode,
  requiredProperties: ["id", "teamId", "userId", "role"],
});
