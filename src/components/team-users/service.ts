import Knex from "knex";
import uuid from "node-uuid";

import { findByEmail as findUserByEmail } from "../users/dao";
import { Role as TeamUserRole, UnsavedTeamUser } from "./types";
import TeamUsersDAO from "./dao";
import UnauthorizedError from "../../errors/unauthorized";
import ResourceNotFoundError from "../../errors/resource-not-found";

const allowedRolesMap: Record<TeamUserRole, TeamUserRole[]> = {
  [TeamUserRole.ADMIN]: [
    TeamUserRole.ADMIN,
    TeamUserRole.EDITOR,
    TeamUserRole.VIEWER,
  ],
  [TeamUserRole.EDITOR]: [TeamUserRole.EDITOR, TeamUserRole.VIEWER],
  [TeamUserRole.VIEWER]: [],
};

export async function createTeamUser(
  trx: Knex.Transaction,
  actorId: string,
  unsavedTeamUser: UnsavedTeamUser
) {
  const actorTeamUser = await TeamUsersDAO.findOne(trx, {
    userId: actorId,
  });

  if (!actorTeamUser) {
    throw new UnauthorizedError(
      "You cannot add a user to a team you are not a member of"
    );
  }

  if (!allowedRolesMap[actorTeamUser.role].includes(unsavedTeamUser.role)) {
    throw new UnauthorizedError(
      "You cannot add a user with the specified role"
    );
  }

  const { userEmail } = unsavedTeamUser;
  const user = await findUserByEmail(userEmail, trx);

  if (!user) {
    throw new ResourceNotFoundError(
      `Could not find user with email: ${userEmail}`
    );
  }

  return TeamUsersDAO.create(trx, {
    id: uuid.v4(),
    teamId: unsavedTeamUser.teamId,
    userId: user.id,
    role: unsavedTeamUser.role,
  });
}
