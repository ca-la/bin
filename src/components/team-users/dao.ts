import Knex from "knex";

import db from "../../services/db";
import { buildDao } from "../../services/cala-component/cala-dao";
import { TeamUserDb, TeamUserDbRow, TeamUser, TeamUserRow } from "./types";
import adapter, { rawAdapter } from "./adapter";

export const rawDao = buildDao<TeamUserDb, TeamUserDbRow>(
  "TeamUserDb" as const,
  "team_users",
  rawAdapter,
  {
    orderColumn: "user_id",
  }
);

export default buildDao<TeamUser, TeamUserRow>(
  "TeamUser" as const,
  "team_users",
  adapter,
  {
    orderColumn: "user_id",
    queryModifier: (query: Knex.QueryBuilder) =>
      query
        .select(db.raw("to_json(users.*) as user"))
        .leftJoin("users", "users.id", "team_users.user_id"),
  }
);
