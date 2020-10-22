import Knex from "knex";
import uuid from "node-uuid";

import { findByEmail as findUserByEmail } from "../users/dao";
import { Role as TeamUserRole, UnsavedTeamUser } from "./types";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "./dao";
import UnauthorizedError from "../../errors/unauthorized";

const allowedRolesMap: Record<TeamUserRole, TeamUserRole[]> = {
  [TeamUserRole.OWNER]: [
    TeamUserRole.ADMIN,
    TeamUserRole.EDITOR,
    TeamUserRole.VIEWER,
  ],
  [TeamUserRole.ADMIN]: [
    TeamUserRole.ADMIN,
    TeamUserRole.EDITOR,
    TeamUserRole.VIEWER,
  ],
  [TeamUserRole.EDITOR]: [TeamUserRole.EDITOR, TeamUserRole.VIEWER],
  [TeamUserRole.VIEWER]: [],
};

export function requireTeamRoles(
  roles: TeamUserRole[],
  getTeamId: (context: TrxContext<AuthedContext<any>>) => Promise<string>
) {
  return function* (
    this: TrxContext<AuthedContext<any, { actorTeamRole?: TeamUserRole }>>,
    next: () => Promise<any>
  ) {
    const { trx, userId } = this.state;

    const teamId = yield getTeamId(this);
    const actorTeamUser =
      this.state.role === "ADMIN"
        ? { role: TeamUserRole.ADMIN }
        : yield TeamUsersDAO.findOne(trx, { teamId, userId });

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

  const id = uuid.v4();

  const user = await findUserByEmail(userEmail, trx);

  const partialUserData = {
    id,
    teamId: unsavedTeamUser.teamId,
    role: unsavedTeamUser.role,
  } as const;

  if (user) {
    await RawTeamUsersDAO.create(trx, {
      ...partialUserData,
      userId: user.id,
      userEmail: null,
    });
  } else {
    await RawTeamUsersDAO.create(trx, {
      ...partialUserData,
      userEmail,
      userId: null,
    });
  }

  return TeamUsersDAO.findById(trx, id);
}
