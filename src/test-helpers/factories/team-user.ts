import Knex from "knex";
import uuid from "node-uuid";

import db from "../../services/db";
import { rawDao as RawTeamUsersDAO } from "../../components/team-users/dao";
import {
  Role as TeamUserRole,
  TeamUserDb,
} from "../../components/team-users/types";
import createUser from "../create-user";

export async function generateTeamUser(
  teamUserOptions: Partial<TeamUserDb & { userId: string; userEmail: null }> & {
    teamId: string;
  },
  options: {
    trx?: Knex.Transaction;
    withUser?: boolean;
  } = {}
) {
  const trx = options.trx || (await db.transaction());

  let userId = teamUserOptions.userId;
  let userWithSession;
  if (options.withUser || userId === undefined) {
    userWithSession = await createUser();
    userId = userWithSession.user.id;
  }

  const teamUserData: TeamUserDb = {
    id: uuid.v4(),
    role: TeamUserRole.OWNER,
    teamOrdering: 0,
    label: null,
    userEmail: null,
    userId: userId as string,
    createdAt: new Date(),
    deletedAt: null,
    updatedAt: new Date(),
    ...teamUserOptions,
  };

  try {
    const teamUser = await RawTeamUsersDAO.create(trx, teamUserData);
    if (!options.trx) {
      await trx.commit();
    }

    return {
      teamUser,
      user: userWithSession,
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}
