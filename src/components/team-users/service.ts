import Knex from "knex";
import uuid from "node-uuid";
import convert from "koa-convert";

import db from "../../services/db";
import { findByEmail as findUserByEmail } from "../users/dao";
import {
  Role as TeamUserRole,
  TeamUser,
  TeamUserDb,
  TeamUserUpdate,
  UnsavedTeamUser,
  teamUserUpdateRoleSchema,
  teamUserUpdateLabelSchema,
  FREE_TEAM_USER_ROLES,
  TEAM_ROLE_PERMISSIVENESS,
} from "./types";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "./dao";
import createTeamUserLock from "./create-team-user-lock";
import UnauthorizedError from "../../errors/unauthorized";
import InsufficientPlanError from "../../errors/insufficient-plan";
import {
  areThereAvailableSeatsInTeamPlan,
  isAvailableSeatLimitExceededInTeamPlan,
} from "../plans/find-team-plans";
import {
  addSeatCharge as addStripeSeatCharge,
  removeSeatCharge as removeStripeSeatCharge,
} from "../../services/stripe/index";
import { check } from "../../services/check";
import { StrictContext } from "../../router-context";

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
  [TeamUserRole.TEAM_PARTNER]: [],
};

export interface TeamUserState {
  teamUser: TeamUser;
}

interface RequireTeamUserByTeamUserIdContext extends StrictContext {
  state: TeamUserState;
  params: {
    teamUserId: string;
  };
}

export const requireTeamUserByTeamUserId = convert.back(
  async (ctx: RequireTeamUserByTeamUserIdContext, next: () => Promise<any>) => {
    const teamUser = await TeamUsersDAO.findById(db, ctx.params.teamUserId);

    if (!teamUser) {
      ctx.throw(`Could not find team user ${ctx.params.teamUserId}`, 404);
    }

    ctx.state.teamUser = teamUser;

    await next();
  }
);

export interface TeamUserRoleState {
  actorTeamRole: TeamUserRole;
}

export interface RequireTeamRolesContext extends StrictContext {
  state: TeamUserRoleState & AuthedState & TeamUserState;
}

export function requireTeamRoles<ContextT extends RequireTeamRolesContext>(
  roles: TeamUserRole[],
  getTeamId: (context: ContextT) => Promise<string | null>,
  options: {
    allowSelf?: (
      context: ContextT,
      actorTeamUserId: string | null
    ) => Promise<boolean>;
    allowNoTeam?: boolean;
  } = {}
) {
  return convert.back(async (ctx: ContextT, next: () => Promise<any>) => {
    const { userId } = ctx.state;

    if (ctx.state.role === "ADMIN") {
      ctx.state.actorTeamRole = TeamUserRole.OWNER;
    } else {
      const teamId = await getTeamId(ctx);

      if (teamId === null && !options.allowNoTeam) {
        ctx.throw(403, "You are not authorized to perform ctx team action");
      } else if (teamId !== null) {
        const actorTeamUser = await TeamUsersDAO.findOne(db, {
          teamId,
          userId,
        });

        if (!actorTeamUser) {
          ctx.throw(403, "You cannot modify a team you are not a member of");
        }

        const isAllowSelf = await (options.allowSelf?.(ctx, actorTeamUser.id) ??
          Promise.resolve(false));
        if (!(roles.includes(actorTeamUser.role) || isAllowSelf)) {
          ctx.throw(403, "You are not authorized to perform ctx team action");
        }

        ctx.state.actorTeamRole = actorTeamUser.role;
      }
    }

    await next();
  });
}

async function assertSeatLimitNotReached(
  trx: Knex.Transaction,
  teamId: string
) {
  const nonViewerCount = await TeamUsersDAO.countBilledUsers(trx, teamId);
  const areThereSeatsInTeamPlan = await areThereAvailableSeatsInTeamPlan(
    trx,
    teamId,
    nonViewerCount
  );
  if (!areThereSeatsInTeamPlan) {
    throw new InsufficientPlanError(
      "Your plan does not allow to add more team users, please upgrade"
    );
  }
}

async function assertSeatLimitNotExceeded(
  trx: Knex.Transaction,
  teamId: string
) {
  const nonViewerCount = await TeamUsersDAO.countBilledUsers(trx, teamId);
  const isSeatLimitExceeded = await isAvailableSeatLimitExceededInTeamPlan(
    trx,
    teamId,
    nonViewerCount
  );
  if (isSeatLimitExceeded) {
    throw new InsufficientPlanError(
      "Your plan does not allow to work with this amount of paid team users, please upgrade"
    );
  }
}

export async function canUserMoveCollectionBetweenTeams({
  trx,
  collectionId,
  userId,
  teamIdToMoveTo,
}: {
  trx: Knex.Transaction;
  collectionId: string;
  userId: string;
  teamIdToMoveTo: string;
}): Promise<boolean> {
  const collectionTeamUsers = await TeamUsersDAO.findByUserAndCollection(
    trx,
    userId,
    collectionId
  );

  if (collectionTeamUsers.length === 0) {
    return false;
  }

  const teamUserFromCollectionTeam = collectionTeamUsers[0];

  if (
    TEAM_ROLE_PERMISSIVENESS[teamUserFromCollectionTeam.role] <
    TEAM_ROLE_PERMISSIVENESS[TeamUserRole.EDITOR]
  ) {
    return false;
  }

  const teamUserFromTeamToMoveTo = await TeamUsersDAO.findByUserAndTeam(trx, {
    userId,
    userEmail: null,
    teamId: teamIdToMoveTo,
  });

  if (teamUserFromTeamToMoveTo === null) {
    return false;
  }

  if (
    TEAM_ROLE_PERMISSIVENESS[teamUserFromTeamToMoveTo.role] <
    TEAM_ROLE_PERMISSIVENESS[TeamUserRole.EDITOR]
  ) {
    return false;
  }

  return true;
}

export async function createTeamUser(
  trx: Knex.Transaction,
  actorTeamRole: TeamUserRole,
  actorSessionRole: string,
  unsavedTeamUser: UnsavedTeamUser
) {
  const { role, teamId, userEmail } = unsavedTeamUser;
  if (
    !allowedRolesMap[actorTeamRole].includes(role) &&
    actorSessionRole !== "ADMIN"
  ) {
    throw new UnauthorizedError(
      "You cannot add a user with the specified role"
    );
  }

  await createTeamUserLock(trx, teamId);

  const isRoleFree = FREE_TEAM_USER_ROLES.includes(role);
  if (!isRoleFree) {
    await assertSeatLimitNotReached(trx, teamId);
  }

  const user = await findUserByEmail(userEmail, trx);

  const created = await RawTeamUsersDAO.create(trx, {
    // Might be overridden if user is revived by DAO from existing deleted row
    id: uuid.v4(),
    teamId,
    role,
    label: null,
    createdAt: new Date(),
    deletedAt: null,
    updatedAt: new Date(),
    ...(user
      ? { userId: user.id, userEmail: null }
      : { userEmail, userId: null }),
  });

  const found = await TeamUsersDAO.findById(trx, created.id);

  if (!found) {
    throw new Error("Could not find created user");
  }

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
    actorSessionRole,
    patch,
  }: {
    before: TeamUser;
    teamId: string;
    teamUserId: string;
    actorTeamRole: TeamUserRole;
    actorSessionRole: string;
    patch: TeamUserUpdate;
  }
): Promise<TeamUser> {
  if (check(teamUserUpdateRoleSchema, patch)) {
    const { role } = patch;
    if (
      !allowedRolesMap[actorTeamRole].includes(role) &&
      actorSessionRole !== "ADMIN"
    ) {
      throw new UnauthorizedError(
        "You cannot update a user with the specified role"
      );
    }

    const isNewRoleFree = FREE_TEAM_USER_ROLES.includes(role);

    if (!isNewRoleFree) {
      await createTeamUserLock(trx, teamId);
    }

    const isPreviousRoleFree = FREE_TEAM_USER_ROLES.includes(before.role);
    if (isPreviousRoleFree && !isNewRoleFree) {
      await assertSeatLimitNotReached(trx, teamId);
    } else if (!isNewRoleFree) {
      await assertSeatLimitNotExceeded(trx, teamId);
    }

    if (role === TeamUserRole.OWNER) {
      await TeamUsersDAO.transferOwnership(trx, teamUserId);
    } else {
      await RawTeamUsersDAO.update(trx, teamUserId, { role });
    }

    if (!isNewRoleFree) {
      if (isPreviousRoleFree) {
        await addStripeSeatCharge(trx, teamId);
      }
    } else {
      if (!isPreviousRoleFree) {
        await removeStripeSeatCharge(trx, teamId);
      }
    }
  } else if (check(teamUserUpdateLabelSchema, patch)) {
    if (
      !allowedRolesMap[actorTeamRole].includes(before.role) &&
      actorSessionRole !== "ADMIN"
    ) {
      throw new UnauthorizedError(
        "You cannot update a user with the specified role"
      );
    }
    const { label } = patch;
    await RawTeamUsersDAO.update(trx, teamUserId, { label });
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
): Promise<TeamUserDb> {
  await createTeamUserLock(trx, teamUser.teamId);

  const deleted = await TeamUsersDAO.deleteById(trx, teamUser.id);

  if (teamUser.role !== TeamUserRole.VIEWER) {
    await removeStripeSeatCharge(trx, teamUser.teamId);
  }

  return deleted;
}
