import { QueryBuilder } from "knex";

import { buildDao } from "../../services/cala-component/cala-dao";
import { Team, TeamRow, TeamDb, TeamDbRow } from "./types";
import adapter, { rawAdapter } from "./adapter";

export const rawDao = buildDao<TeamDb, TeamDbRow>("Team", "teams", rawAdapter, {
  orderColumn: "created_at",
});

export default buildDao<Team, TeamRow>("Team", "teams", adapter, {
  orderColumn: "created_at",
  queryModifier: (query: QueryBuilder) =>
    query
      .select("team_users.role as role")
      .join("team_users", "team_users.team_id", "teams.id"),
});
