import Knex from "knex";

import { buildDao } from "../../services/cala-component/cala-dao";
import { Team, TeamRow } from "./types";
import adapter from "./adapter";

const dao = buildDao<Team, TeamRow>("Team", "teams", adapter, {
  orderColumn: "created_at",
});

export default {
  ...dao,
  findByUser(trx: Knex.Transaction, userId: string): Promise<Team[]> {
    return dao.find(trx, {}, (query: Knex.QueryBuilder) =>
      query
        .join("team_users", "team_users.team_id", "teams.id")
        .where({ "team_users.user_id": userId })
    );
  },
};
