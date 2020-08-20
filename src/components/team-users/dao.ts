import { buildDao } from "../../services/cala-component/cala-dao";
import { TeamUser, TeamUserRow } from "./types";
import adapter from "./adapter";

export default buildDao<TeamUser, TeamUserRow>(
  "TeamUser" as const,
  "team_users",
  adapter,
  {
    orderColumn: "user_id",
  }
);
