import Knex from "knex";
import process from "process";
import uuid from "node-uuid";
import { chunk } from "lodash";

import { log, logServerError } from "../services/logger";
import { green, reset } from "../services/colors";
import db from "../services/db";
import TeamsDAO from "../components/teams/dao";
import { TeamDb, TeamType } from "../components/teams/types";
import { rawDao as RawTeamUsersDAO } from "../components/team-users/dao";
import { TeamUserDb, Role } from "../components/team-users/types";

async function backfillUserTeams() {
  return db.transaction(async (trx: Knex.Transaction) => {
    const usersWithNoTeams = await trx
      .select<{ id: string; name: string }[]>(["users.id", "users.name"])
      .from("users")
      .leftJoin("team_users", "team_users.user_id", "users.id")
      .whereNotNull("users.name")
      .andWhere({ "team_users.id": null })
      .groupBy("users.id");

    log(`Found ${usersWithNoTeams.length} users who are not in a team`);

    const teamsToCreate: TeamDb[] = [];
    const teamOwnersToCreate: TeamUserDb[] = [];

    for (const user of usersWithNoTeams) {
      const teamId = uuid.v4();
      const teamUserId = uuid.v4();

      teamsToCreate.push({
        id: teamId,
        title: `${user.name}'s Team`,
        createdAt: new Date(),
        deletedAt: null,
        type: TeamType.DESIGNER,
      });

      teamOwnersToCreate.push({
        teamId,
        userId: user.id,
        userEmail: null,
        id: teamUserId,
        role: Role.OWNER,
        createdAt: new Date(),
        deletedAt: null,
        updatedAt: new Date(),
      });
    }

    for (const teamChunk of chunk(teamsToCreate, 1000)) {
      await TeamsDAO.createAll(trx, teamChunk);
    }
    for (const ownerChunk of chunk(teamOwnersToCreate, 1000)) {
      await RawTeamUsersDAO.createAll(trx, ownerChunk);
    }
  });
}

backfillUserTeams()
  .then(() => {
    log(green, `Successfully backfilled!`, reset);
    process.exit();
  })
  .catch((err: any): void => {
    logServerError(err.message);
    process.exit(1);
  });
