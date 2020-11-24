import uuid from "node-uuid";
import Knex from "knex";

import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role } from "../team-users/types";
import { rawDao as RawTeamsDAO } from "./dao";
import { TeamDb, TeamType } from "./types";

export async function createTeamWithOwner(
  trx: Knex.Transaction,
  title: string,
  ownerUserId: string
): Promise<TeamDb> {
  const created = await RawTeamsDAO.create(trx, {
    id: uuid.v4(),
    title,
    createdAt: new Date(),
    deletedAt: null,
    type: TeamType.DESIGNER,
  });
  await RawTeamUsersDAO.create(trx, {
    teamId: created.id,
    userId: ownerUserId,
    userEmail: null,
    id: uuid.v4(),
    role: Role.OWNER,
    createdAt: new Date(),
    deletedAt: null,
    updatedAt: new Date(),
  });

  return created;
}
