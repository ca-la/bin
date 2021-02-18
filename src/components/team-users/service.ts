import Knex from "knex";
import uuid from "node-uuid";

import db from "../../services/db";
import { findByEmail as findUserByEmail } from "../users/dao";
import {
  Role as TeamUserRole,
  TeamUser,
  TeamUserDb,
  TeamUserUpdate,
  UnsavedTeamUser,
} from "./types";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "./dao";
import createTeamUserLock from "./create-team-user-lock";
import UnauthorizedError from "../../errors/unauthorized";
import InsufficientPlanError from "../../errors/insufficient-plan";
import { areThereAvailableSeatsInTeamPlan } from "../plans/find-team-plans";
import {
  addSeatCharge as addStripeSeatCharge,
  removeSeatCharge as removeStripeSeatCharge,
} from "../../services/stripe/index";

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
  this: AuthedContext<any, { teamUser: TeamUser }>,
  next: () => Promise<any>
): Generator<any, any, any> {
  const teamUser = yield TeamUsersDAO.findById(db, this.params.teamUserId);

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
  getTeamId: (context: AuthedContext<any, StateT>) => Promise<string | null>,
  options: {
    allowSelf?: (
      context: AuthedContext<any, StateT>,
      actorTeamUserId: string | null
    ) => Promise<boolean>;
    allowNoTeam?: boolean;
  } = {}
) {
  return function* (
    this: AuthedContext<any, { actorTeamRole?: TeamUserRole } & StateT>,
    next: () => Promise<any>
  ) {
    const { userId } = this.state;

    if (this.state.role === "ADMIN") {
      this.state.actorTeamRole = TeamUserRole.OWNER;
    } else {
      const teamId = yield getTeamId(this);

      if (teamId === null && !options.allowNoTeam) {
        this.throw(403, "You are not authorized to perform this team action");
      } else if (teamId !== null) {
        const actorTeamUser = yield TeamUsersDAO.findOne(db, {
          teamId,
          userId,
        });

        if (!actorTeamUser) {
          this.throw(403, "You cannot modify a team you are not a member of");
        }

        const isAllowSelf = yield options.allowSelf?.(this, actorTeamUser.id) ??
          Promise.resolve(false);
        if (!(roles.includes(actorTeamUser.role) || isAllowSelf)) {
          this.throw(403, "You are not authorized to perform this team action");
        }

        this.state.actorTeamRole = actorTeamUser.role;
      }
    }

    yield next;
  };
}

async function assertSeatAvailability(
  trx: Knex.Transaction,
  teamId: string,
  isAdmin?: boolean
) {
  const nonViewerCount = await TeamUsersDAO.countBilledUsers(trx, teamId);
  const areThereSeatsInTeamPlan = await areThereAvailableSeatsInTeamPlan(
    trx,
    teamId,
    nonViewerCount,
    isAdmin
  );
  if (!areThereSeatsInTeamPlan) {
    throw new InsufficientPlanError(
      "Your plan does not allow to add more team users, please upgrade"
    );
  }
}

export async function createTeamUser(
  trx: Knex.Transaction,
  actorTeamRole: TeamUserRole,
  unsavedTeamUser: UnsavedTeamUser,
  isAdmin?: boolean
) {
  const { role, teamId, userEmail } = unsavedTeamUser;
  if (!allowedRolesMap[actorTeamRole].includes(role)) {
    throw new UnauthorizedError(
      "You cannot add a user with the specified role"
    );
  }

  await createTeamUserLock(trx, teamId);

  if (role !== TeamUserRole.VIEWER) {
    await assertSeatAvailability(trx, teamId, isAdmin);
  }

  const user = await findUserByEmail(userEmail, trx);

  const created = await RawTeamUsersDAO.create(trx, {
    // Might be overridden if user is revived by DAO from existing deleted row
    id: uuid.v4(),
    teamId,
    role,
    createdAt: new Date(),
    deletedAt: null,
    updatedAt: new Date(),
    ...(user
      ? { userId: user.id, userEmail: null }
      : { userEmail, userId: null }),
  });

  const found = await TeamUsersDAO.findById(trx, created.id);

  if (role !== TeamUserRole.VIEWER) {
    await addStripeSeatCharge(trx, teamId);
  }

  return found;
}

export async function updateTeamUser(
  trx: Knex.Transaction,
  {
    before,
    teamId,
    teamUserId,
    actorTeamRole,
    patch,
    isAdmin,
  }: {
    before: TeamUser;
    teamId: string;
    teamUserId: string;
    actorTeamRole: TeamUserRole;
    patch: TeamUserUpdate;
    isAdmin?: boolean;
  }
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

        if (role !== TeamUserRole.VIEWER) {
          await createTeamUserLock(trx, teamId);
          await assertSeatAvailability(trx, teamId, isAdmin);
        }

        if (role === TeamUserRole.OWNER) {
          await TeamUsersDAO.transferOwnership(trx, teamUserId);
        } else {
          await RawTeamUsersDAO.update(trx, teamUserId, { role });
        }

        if (role !== TeamUserRole.VIEWER) {
          if (before.role === TeamUserRole.VIEWER) {
            await addStripeSeatCharge(trx, teamId);
          }
        } else {
          if (before.role !== TeamUserRole.VIEWER) {
            await removeStripeSeatCharge(trx, teamId);
          }
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

export async function removeTeamUser(
  trx: Knex.Transaction,
  teamUser: TeamUserDb
) {
  await createTeamUserLock(trx, teamUser.teamId);

  const deleted = await TeamUsersDAO.deleteById(trx, teamUser.id);

  if (teamUser.role !== TeamUserRole.VIEWER) {
    await removeStripeSeatCharge(trx, teamUser.teamId);
  }

  return deleted;
}
