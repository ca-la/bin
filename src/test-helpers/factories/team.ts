import uuid from "node-uuid";

import db from "../../services/db";
import { rawDao as RawTeamsDAO } from "../../components/teams/dao";
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
    const team = await RawTeamsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      id: uuid.v4(),
      title: "A team",
      type: TeamType.DESIGNER,
      ...teamOptions,
    });
    const teamUser = await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.ADMIN,
      teamId: team.id,
      userId: adminUserId,
      userEmail: null,
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
