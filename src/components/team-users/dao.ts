import Knex from "knex";

import db from "../../services/db";
import { buildDao } from "../../services/cala-component/cala-dao";
import { TeamUserDb, TeamUserDbRow, TeamUser, TeamUserRow } from "./types";
import adapter, { rawAdapter } from "./adapter";

const TABLE_NAME = "team_users";

export const rawDao = buildDao<TeamUserDb, TeamUserDbRow>(
  "TeamUserDb" as const,
  TABLE_NAME,
  rawAdapter,
  {
    orderColumn: "user_id",
    excludeDeletedAt: false,
  }
);

const dao = buildDao<TeamUser, TeamUserRow>(
  "TeamUser" as const,
  TABLE_NAME,
  adapter,
  {
    orderColumn: "user_id",
    excludeDeletedAt: false,
    queryModifier: (query: Knex.QueryBuilder) =>
      query
        .select(db.raw("to_json(users.*) as user"))
        .leftJoin("users", "users.id", "team_users.user_id"),
  }
);

async function deleteById(trx: Knex.Transaction, teamUserId: string) {
  return trx(TABLE_NAME).del().where({ id: teamUserId });
}

export default {
  ...dao,
  deleteById,
};

export async function claimAllByEmail(
  trx: Knex.Transaction,
  email: string,
  userId: string
): Promise<TeamUser[]> {
  const rows = await trx(TABLE_NAME)
    .update({ user_email: null, user_id: userId }, "*")
    .where({ user_email: email });

  return rows.map(adapter.fromDb);
}
