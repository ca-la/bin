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
    TeamUserRole.OWNER,
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

export function* requireTeamUserByTeamUserId(
  this: TrxContext<AuthedContext<any, { teamUser: TeamUser }>>,
  next: () => Promise<any>
): Generator<any, any, any> {
  const teamUser = yield TeamUsersDAO.findById(
    this.state.trx,
    this.params.teamUserId
  );

  if (!teamUser) {
    return this.throw(
      `Could not find team user ${this.params.teamUserId}`,
      404
    );
  }

  this.state.teamUser = teamUser;

  yield next;
}

export function requireTeamRoles<StateT>(
  roles: TeamUserRole[],
  getTeamId: (
    context: TrxContext<AuthedContext<any, StateT>>
  ) => Promise<string | null>,
  options: { allowSelf?: boolean; allowNoTeam?: boolean } = {}
) {
  return function* (
    this: TrxContext<
      AuthedContext<any, { actorTeamRole?: TeamUserRole } & StateT>
    >,
    next: () => Promise<any>
  ) {
    const { trx, userId } = this.state;

    if (this.state.role === "ADMIN") {
      this.state.actorTeamRole = TeamUserRole.OWNER;
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

  const user = await findUserByEmail(userEmail, trx);

  const created = await RawTeamUsersDAO.create(trx, {
    // Might be overridden if user is revived by DAO from existing deleted row
    id: uuid.v4(),
    teamId: unsavedTeamUser.teamId,
    role: unsavedTeamUser.role,
    createdAt: new Date(),
    deletedAt: null,
    updatedAt: new Date(),
    ...(user
      ? { userId: user.id, userEmail: null }
      : { userEmail, userId: null }),
  });

  return TeamUsersDAO.findById(trx, created.id);
}

export async function updateTeamUser(
  trx: Knex.Transaction,
  teamUserId: string,
  actorTeamRole: TeamUserRole,
  patch: TeamUserUpdate
): Promise<TeamUser> {
  for (const keyToUpdate of Object.keys(patch) as (keyof TeamUserUpdate)[]) {
    switch (keyToUpdate) {
      case "role": {
        const { role } = patch;
        if (!allowedRolesMap[actorTeamRole].includes(role)) {
          throw new UnauthorizedError(
            "You cannot update a user with the specified role"
          );
        }

        if (role === TeamUserRole.OWNER) {
          await TeamUsersDAO.transferOwnership(trx, teamUserId);
        } else {
          await RawTeamUsersDAO.update(trx, teamUserId, { role });
        }
      }
    }
  }

  const updated = await TeamUsersDAO.findById(trx, teamUserId);
  if (!updated) {
    throw new Error("Could not find updated team user");
  }
  return updated;
}
