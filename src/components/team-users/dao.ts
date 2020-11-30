import Knex from "knex";

import db from "../../services/db";
import { buildDao } from "../../services/cala-component/cala-dao";
import { TeamUserDb, TeamUserDbRow, TeamUser, TeamUserRow } from "./types";
import adapter, { rawAdapter } from "./adapter";

const TABLE_NAME = "team_users";

const rawStandardDao = buildDao<TeamUserDb, TeamUserDbRow>(
  "TeamUserDb" as const,
  TABLE_NAME,
  rawAdapter,
  {
    orderColumn: "user_id",
    excludeDeletedAt: false,
  }
);

export async function create(trx: Knex.Transaction, data: TeamUserDb) {
  const found = await findByUserAndTeam(trx, {
    userId: data.userId,
    userEmail: data.userEmail,
    teamId: data.teamId,
  });

  if (found) {
    await trx(TABLE_NAME)
      .update({
        deleted_at: null,
        role: data.role,
        updated_at: new Date(),
      })
      .where({ id: found.id });
    const revived = await rawStandardDao.findById(trx, found.id);

    if (!revived) {
      throw new Error("Could not find created team user");
    }

    return revived;
  }

  return rawStandardDao.create(trx, data);
}

export const rawDao = { ...rawStandardDao, create };

const withUser = (query: Knex.QueryBuilder) =>
  query
    .select(db.raw("to_json(users.*) as user"))
    .leftJoin("users", "users.id", "team_users.user_id");

const dao = buildDao<TeamUser, TeamUserRow>(
  "TeamUser" as const,
  TABLE_NAME,
  adapter,
  {
    orderColumn: "user_id",
    excludeDeletedAt: false,
    queryModifier: withUser,
  }
);

function deleteById(trx: Knex.Transaction, teamUserId: string) {
  return trx(TABLE_NAME)
    .update({ deleted_at: new Date() })
    .where({ id: teamUserId });
}

export async function claimAllByEmail(
  trx: Knex.Transaction,
  email: string,
  userId: string
): Promise<TeamUserDb[]> {
  const rows = await trx(TABLE_NAME)
    .update({ user_email: null, user_id: userId }, "*")
    .where({ user_email: email });

  return rows.map(rawAdapter.fromDb);
}

export async function findByUserAndTeam(
  trx: Knex.Transaction,
  {
    userId,
    userEmail,
    teamId,
  }: {
    userId: string | null;
    userEmail: string | null;
    teamId: string;
  }
) {
  const found: TeamUserRow | undefined = await trx(TABLE_NAME)
    .select("team_users.*")
    .where({ user_id: userId, user_email: userEmail, team_id: teamId })
    .modify(withUser)
    .first();

  return found ? adapter.fromDb(found) : null;
}

export default {
  ...dao,
  deleteById,
  claimAllByEmail,
  findByUserAndTeam,
};
