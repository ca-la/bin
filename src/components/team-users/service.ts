import Knex from "knex";
import uuid from "node-uuid";

import { findByEmail as findUserByEmail } from "../users/dao";
import {
  Role as TeamUserRole,
  TeamUser,
  TeamUserUpdate,
  UnsavedTeamUser,
} from "./types";
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
  getTeamId: (
    context: TrxContext<AuthedContext<any>>
  ) => Promise<string | null>,
  options: { allowSelf?: boolean; allowNoTeam?: boolean } = {}
) {
  return function* (
    this: TrxContext<AuthedContext<any, { actorTeamRole?: TeamUserRole }>>,
    next: () => Promise<any>
  ) {
    const { trx, userId } = this.state;

    if (this.state.role === "ADMIN") {
      this.state.actorTeamRole = TeamUserRole.ADMIN;
    } else {
      const teamId = yield getTeamId(this);

      if (teamId === null && !options.allowNoTeam) {
        this.throw(403, "You are not authorized to perform this team action");
      } else if (teamId !== null) {
        const actorTeamUser = yield TeamUsersDAO.findOne(trx, {
          teamId,
          userId,
        });

        if (!actorTeamUser) {
          this.throw(403, "You cannot modify a team you are not a member of");
        }

        const actorIsTeamUser = userId === actorTeamUser.userId;
        if (
          !(
            roles.includes(actorTeamUser.role) ||
            (actorIsTeamUser && options.allowSelf)
          )
        ) {
          this.throw(403, "You are not authorized to perform this team action");
        }

        this.state.actorTeamRole = actorTeamUser.role;
      }
    }

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
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
  } else {
    await RawTeamUsersDAO.create(trx, {
      ...partialUserData,
      userEmail,
      userId: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
  }

  return TeamUsersDAO.findById(trx, id);
}

export async function updateTeamUser(
  trx: Knex.Transaction,
  teamUserId: string,
  actorTeamRole: TeamUserRole,
  patch: TeamUserUpdate
): Promise<TeamUser> {
  if (!allowedRolesMap[actorTeamRole].includes(patch.role)) {
    throw new UnauthorizedError(
      "You cannot update a user with the specified role"
    );
  }

  await TeamUsersDAO.update(trx, teamUserId, patch);

  const updated = await TeamUsersDAO.findById(trx, teamUserId);
  if (!updated) {
    throw new Error("Could not find updated team user");
  }
  return updated;
}
