import uuid from "node-uuid";

import db from "../../services/db";
import TeamsDAO from "../../components/teams/dao";
import { rawDao as RawTeamUsersDAO } from "../../components/team-users/dao";
import { TeamDb, TeamType } from "../../components/teams/types";
import {
  Role as TeamUserRole,
  TeamUserDb,
} from "../../components/team-users/types";

export async function generateTeam(
  adminUserId: string,
  teamOptions: Partial<TeamDb> = {},
  teamUserOptions: Partial<
    TeamUserDb & { userId: string; userEmail: null }
  > = {}
) {
  const trx = await db.transaction();
  try {
    const team = await TeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "A team",
      type: TeamType.DESIGNER,
      ...teamOptions,
    });
    const teamUser = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.OWNER,
      teamId: team.id,
      userId: adminUserId,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
      ...teamUserOptions,
    });

    await trx.commit();

    return {
      team,
      teamUser,
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}
