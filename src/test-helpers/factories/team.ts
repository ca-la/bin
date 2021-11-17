import Knex from "knex";
import uuid from "node-uuid";

import db from "../../services/db";
import TeamsDAO from "../../components/teams/dao";
import { rawDao as RawTeamUsersDAO } from "../../components/team-users/dao";
import { TeamDb, TeamType } from "../../components/teams/types";
import {
  Role as TeamUserRole,
  TeamUserDb,
} from "../../components/team-users/types";
import { PlanDb } from "../../components/plans/types";
import { generateSubscription } from "./subscription";

export async function generateTeam(
  adminUserId: string,
  teamOptions: Partial<TeamDb> = {},
  teamUserOptions: Partial<
    TeamUserDb & { userId: string; userEmail: null }
  > = {},
  planOptions: Partial<PlanDb> = {},
  trx?: Knex.Transaction
) {
  const transaction = trx || (await db.transaction());
  try {
    const team = await TeamsDAO.create(transaction, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "A team",
      type: TeamType.DESIGNER,
      ...teamOptions,
    });
    const teamUser = await RawTeamUsersDAO.create(transaction, {
      id: uuid.v4(),
      role: TeamUserRole.OWNER,
      teamOrdering: 0,
      label: null,
      teamId: team.id,
      userId: adminUserId,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
      ...teamUserOptions,
    });

    const { plan, subscription } = await generateSubscription(
      transaction,
      { teamId: team.id },
      planOptions
    );

    if (!trx) {
      await transaction.commit();
    }

    return {
      team,
      teamUser,
      plan,
      subscription,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
