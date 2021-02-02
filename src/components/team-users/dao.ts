import Knex from "knex";

import db from "../../services/db";
import { buildDao } from "../../services/cala-component/cala-dao";
import first from "../../services/first";
import {
  TeamUserDb,
  TeamUserDbRow,
  TeamUser,
  TeamUserRow,
  Role as TeamUserRole,
} from "./types";
import adapter, { rawAdapter } from "./adapter";
import ResourceNotFoundError from "../../errors/resource-not-found";

const TABLE_NAME = "team_users";

const rawStandardDao = buildDao<TeamUserDb, TeamUserDbRow>(
  "TeamUserDb" as const,
  TABLE_NAME,
  rawAdapter,
  {
    orderColumn: "created_at",
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
    orderColumn: "created_at",
    queryModifier: withUser,
  }
);

async function deleteById(
  trx: Knex.Transaction,
  teamUserId: string
): Promise<TeamUserDb> {
  const deleted: TeamUserRow | undefined = await trx(TABLE_NAME)
    .update({ deleted_at: new Date() }, "*")
    .where({ id: teamUserId })
    .then((rows: TeamUserRow[]) => first<TeamUserRow>(rows));

  if (!deleted) {
    throw new Error(`Failed to delete team user with ${teamUserId} id`);
  }

  return rawAdapter.fromDb(deleted);
}

async function claimAllByEmail(
  trx: Knex.Transaction,
  email: string,
  userId: string
): Promise<TeamUserDb[]> {
  const rows = await trx(TABLE_NAME)
    .update({ user_email: null, user_id: userId }, "*")
    .where({ user_email: email });

  return rows.map(rawAdapter.fromDb);
}

async function findByUserAndTeam(
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

async function transferOwnership(trx: Knex.Transaction, newOwnerId: string) {
  const maybeTeam = await trx(TABLE_NAME)
    .select<{ team_id: string }>("team_id")
    .where({ id: newOwnerId })
    .andWhereNot({ user_id: null })
    .first();

  if (!maybeTeam) {
    throw new ResourceNotFoundError(
      `Could not find team user with ID ${newOwnerId}`
    );
  }

  const { team_id: teamId } = maybeTeam;

  await trx(TABLE_NAME)
    .update({ role: TeamUserRole.ADMIN })
    .where({ team_id: teamId, role: TeamUserRole.OWNER });
  await trx(TABLE_NAME)
    .update({ role: TeamUserRole.OWNER })
    .where({ team_id: teamId, id: newOwnerId });
}

async function findByUserAndDesign(
  trx: Knex.Transaction,
  userId: string,
  designId: string
) {
  const teamUsers = await trx
    .select("team_users.*")
    .from("collection_designs")
    .join("collections", "collections.id", "collection_designs.collection_id")
    .join("team_users", "team_users.team_id", "collections.team_id")
    .where({
      "collections.deleted_at": null,
      "collection_designs.design_id": designId,
      "team_users.deleted_at": null,
      "team_users.user_id": userId,
    })
    .modify(withUser);

  return adapter.fromDbArray(teamUsers);
}

async function countNonViewers(
  trx: Knex.Transaction,
  teamId: string
): Promise<number> {
  return dao.count(trx, { teamId }, (query: Knex.QueryBuilder) =>
    query.whereNotIn("role", [TeamUserRole.VIEWER])
  );
}

export default {
  ...dao,
  deleteById,
  claimAllByEmail,
  findByUserAndTeam,
  transferOwnership,
  findByUserAndDesign,
  countNonViewers,
};
