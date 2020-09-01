import Knex from "knex";
import uuid from "node-uuid";

import { findByEmail as findUserByEmail } from "../users/dao";
import { Role as TeamUserRole, UnsavedTeamUser } from "./types";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "./dao";
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

export function requireTeamRoles(roles: TeamUserRole[]) {
  return function* (
    this: TrxContext<AuthedContext<{}, { actorTeamRole?: TeamUserRole }>>,
    next: () => Promise<any>
  ) {
    const { trx, userId } = this.state;

    const actorTeamUser = yield TeamUsersDAO.findOne(trx, { userId });

    if (!actorTeamUser) {
      this.throw(
        403,
        "You cannot add a user to a team you are not a member of"
      );
    }

    if (!roles.includes(actorTeamUser.role)) {
      this.throw(403, "You are not authorized to perform this team action");
    }

    this.state.actorTeamRole = actorTeamUser.role;
    yield next;
  };
}

export async function createTeamUser(
  trx: Knex.Transaction,
  actorTeamRole: TeamUserRole,
  unsavedTeamUser: UnsavedTeamUser
) {
  if (!allowedRolesMap[actorTeamRole].includes(unsavedTeamUser.role)) {
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

  const id = uuid.v4();

  await RawTeamUsersDAO.create(trx, {
    id,
    teamId: unsavedTeamUser.teamId,
    userId: user.id,
    role: unsavedTeamUser.role,
  });

  return TeamUsersDAO.findById(trx, id);
}
