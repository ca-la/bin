import convert from "koa-convert";

import db from "../../services/db";
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import { requireQueryParam } from "../../middleware/require-query-param";
import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../middleware/type-guard";
import { generateUpgradeBodyDueToUsersLimit, UpgradeTeamBody } from "../teams";

import UnauthorizedError from "../../errors/unauthorized";
import InsufficientPlanError from "../../errors/insufficient-plan";
import { check } from "../../services/check";

import {
  UnsavedTeamUser,
  Role as TeamUserRole,
  TeamUserUpdate,
  teamUserUpdateSchema,
  teamUserUpdateRoleSchema,
  TeamUser,
  teamUserDomain,
  unsavedTeamUserSchema,
  TeamUserDb,
} from "./types";
import {
  createTeamUser,
  requireTeamRoles,
  updateTeamUser,
  requireTeamUserByTeamUserId,
  removeTeamUser,
  TeamUserRoleState,
  TeamUserState,
  RequireTeamRolesContext,
} from "./service";
import TeamUsersDAO from "./dao";
import { emit } from "../../services/pubsub";
import {
  RouteCreated,
  RouteUpdated,
  RouteDeleted,
} from "../../services/pubsub/cala-events";
import ConflictError from "../../errors/conflict";
import { StrictContext } from "../../router-context";

interface FindTeamByTeamUserContext extends StrictContext {
  state: TeamUserState;
}
async function findTeamByTeamUser(context: FindTeamByTeamUserContext) {
  return context.state.teamUser.teamId;
}

interface CreateContext extends StrictContext<TeamUser | UpgradeTeamBody> {
  state: AuthedState &
    TransactionState &
    SafeBodyState<UnsavedTeamUser> &
    TeamUserRoleState;
}

async function create(ctx: CreateContext) {
  const { trx, actorTeamRole, userId: actorUserId, role, safeBody } = ctx.state;

  try {
    const created = await createTeamUser(trx, actorTeamRole, role, safeBody);

    await emit<TeamUser, RouteCreated<TeamUser, typeof teamUserDomain>>({
      type: "route.created",
      domain: teamUserDomain,
      actorId: actorUserId,
      trx,
      created,
    });

    ctx.body = created;
    ctx.status = 201;
  } catch (error) {
    if (error instanceof InsufficientPlanError) {
      ctx.status = 402;
      ctx.body = await generateUpgradeBodyDueToUsersLimit(
        trx,
        safeBody.teamId,
        safeBody.role
      );
      return;
    }
    if (error instanceof UnauthorizedError) {
      ctx.throw(403, error.message);
    }
    if (error instanceof ConflictError) {
      ctx.throw(409, error.message);
    }
    throw error;
  }
}

interface GetListContext extends StrictContext<TeamUser[]> {
  query: {
    teamId: string;
  };
}

async function getList(ctx: GetListContext) {
  const { teamId } = ctx.query;

  ctx.body = await TeamUsersDAO.find(db, { teamId });
  ctx.status = 200;
}

interface UpdateContext extends StrictContext<TeamUser | UpgradeTeamBody> {
  state: TransactionState &
    SafeBodyState<TeamUserUpdate> &
    TeamUserState &
    TeamUserRoleState &
    AuthedState;
  params: { teamUserId: string };
}

async function update(ctx: UpdateContext) {
  const {
    trx,
    actorTeamRole,
    teamUser,
    userId: actorUserId,
    role,
    safeBody,
  } = ctx.state;
  const { teamUserId } = ctx.params;

  if (check(teamUserUpdateRoleSchema, safeBody)) {
    const isTryingToUpdateTeamOwner = teamUser.role === TeamUserRole.OWNER;
    if (isTryingToUpdateTeamOwner) {
      ctx.throw(403, `You cannot update team owner role`);
    }
  }

  const before = await TeamUsersDAO.findById(trx, teamUserId);

  ctx.assert(before, 404, `Could not find team user with ID ${teamUserId}`);

  try {
    const updated = await updateTeamUser(trx, {
      before,
      teamId: before.teamId,
      teamUserId,
      actorTeamRole,
      actorSessionRole: role,
      patch: safeBody,
    });

    await emit<TeamUser, RouteUpdated<TeamUser, typeof teamUserDomain>>({
      type: "route.updated",
      domain: teamUserDomain,
      actorId: actorUserId,
      trx,
      before,
      updated,
    });

    ctx.body = updated;
    ctx.status = 200;
  } catch (error) {
    if (error instanceof InsufficientPlanError) {
      ctx.status = 402;
      const updatedRole = check(teamUserUpdateRoleSchema, safeBody)
        ? safeBody.role
        : before.role;
      ctx.body = await generateUpgradeBodyDueToUsersLimit(
        trx,
        before.teamId,
        updatedRole
      );
      return;
    }
    throw error;
  }
}

interface DeleteContext extends StrictContext {
  state: AuthedState & TransactionState & TeamUserState;
}

async function deleteTeamUser(ctx: DeleteContext) {
  const { trx, teamUser, userId: actorUserId } = ctx.state;

  const isTryingToDeleteTeamOwner = teamUser.role === TeamUserRole.OWNER;
  ctx.assert(
    !isTryingToDeleteTeamOwner,
    403,
    "You cannot delete the owner of the team"
  );

  const deleted = await removeTeamUser(trx, teamUser);

  await emit<TeamUserDb, RouteDeleted<TeamUserDb, typeof teamUserDomain>>({
    type: "route.deleted",
    domain: teamUserDomain,
    actorId: actorUserId,
    trx,
    deleted,
  });
  ctx.status = 204;
}

interface CreateRequireTeamRolesContext extends RequireTeamRolesContext {
  state: RequireTeamRolesContext["state"] & SafeBodyState<UnsavedTeamUser>;
}

interface GetListRequireTeamRolesContext extends RequireTeamRolesContext {
  query: { teamId: string };
}

interface DeleteRequireTeamRolesContext extends RequireTeamRolesContext {
  params: { teamUserId: string };
}

export default {
  prefix: "/team-users",
  routes: {
    "/": {
      post: [
        requireAuth,
        typeGuardFromSchema(unsavedTeamUserSchema),
        requireTeamRoles(
          [TeamUserRole.OWNER, TeamUserRole.ADMIN, TeamUserRole.EDITOR],
          async (context: CreateRequireTeamRolesContext) =>
            context.state.safeBody.teamId
        ),
        useTransaction,
        convert.back(create),
      ],
      get: [
        requireAuth,
        requireQueryParam<GetListContext["query"]>("teamId"),
        requireTeamRoles(
          Object.values(TeamUserRole),
          async (context: GetListRequireTeamRolesContext) =>
            context.query.teamId
        ),
        convert.back(getList),
      ],
    },
    "/:teamUserId": {
      patch: [
        requireAuth,
        useTransaction,
        typeGuardFromSchema(teamUserUpdateSchema),
        requireTeamUserByTeamUserId,
        requireTeamRoles(
          [TeamUserRole.OWNER, TeamUserRole.ADMIN, TeamUserRole.EDITOR],
          findTeamByTeamUser
        ),
        convert.back(update),
      ],
      del: [
        requireAuth,
        requireTeamUserByTeamUserId,
        requireTeamRoles(
          [TeamUserRole.ADMIN, TeamUserRole.OWNER],
          findTeamByTeamUser,
          {
            allowSelf: async (
              context: DeleteRequireTeamRolesContext,
              actorTeamUserId: string | null
            ) => context.params.teamUserId === actorTeamUserId,
          }
        ),
        useTransaction,
        convert.back(deleteTeamUser),
      ],
    },
  },
};
