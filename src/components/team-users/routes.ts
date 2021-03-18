import db from "../../services/db";
import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import { requireQueryParam } from "../../middleware/require-query-param";
import { typeGuard, typeGuardFromSchema } from "../../middleware/type-guard";
import { generateUpgradeBodyDueToUsersLimit } from "../teams";

import UnauthorizedError from "../../errors/unauthorized";
import InsufficientPlanError from "../../errors/insufficient-plan";
import { check } from "../../services/check";

import {
  isUnsavedTeamUser,
  UnsavedTeamUser,
  Role as TeamUserRole,
  TeamUserUpdate,
  teamUserUpdateSchema,
  teamUserUpdateRoleSchema,
  TeamUser,
  teamUserDomain,
} from "./types";
import {
  createTeamUser,
  requireTeamRoles,
  updateTeamUser,
  requireTeamUserByTeamUserId,
  removeTeamUser,
} from "./service";
import TeamUsersDAO from "./dao";
import { emit } from "../../services/pubsub";
import {
  RouteCreated,
  RouteUpdated,
  RouteDeleted,
} from "../../services/pubsub/cala-events";
import ConflictError from "../../errors/conflict";

async function findTeamByTeamUser(
  context: AuthedContext<any, { teamUser: TeamUser }>
) {
  return context.state.teamUser.teamId;
}

function* create(
  this: TrxContext<
    AuthedContext<UnsavedTeamUser, { actorTeamRole: TeamUserRole }>
  >
) {
  const { body } = this.request;
  const { trx, actorTeamRole, userId: actorUserId } = this.state;

  try {
    const created = yield createTeamUser(trx, actorTeamRole, body);
    yield emit<TeamUser, RouteCreated<TeamUser, typeof teamUserDomain>>({
      type: "route.created",
      domain: teamUserDomain,
      actorId: actorUserId,
      trx,
      created,
    });

    this.body = created;
    this.status = 201;
  } catch (error) {
    if (error instanceof InsufficientPlanError) {
      this.status = 402;
      this.body = yield generateUpgradeBodyDueToUsersLimit(
        trx,
        body.teamId,
        body.role
      );
      return;
    }
    if (error instanceof UnauthorizedError) {
      this.throw(403, error.message);
    }
    if (error instanceof ConflictError) {
      this.throw(409, error.message);
    }
    throw error;
  }
}

function* getList(this: AuthedContext) {
  const { teamId } = this.request.query;

  this.body = yield TeamUsersDAO.find(db, { teamId });
  this.status = 200;
}

function* update(
  this: TrxContext<
    AuthedContext<
      TeamUserUpdate,
      { actorTeamRole: TeamUserRole; teamUser: TeamUser }
    >
  >
) {
  const { trx, actorTeamRole, teamUser, userId: actorUserId } = this.state;
  const { teamUserId } = this.params;
  const { body } = this.request;

  if (check(teamUserUpdateRoleSchema, body)) {
    const isTryingToUpdateTeamOwner = teamUser.role === TeamUserRole.OWNER;
    if (isTryingToUpdateTeamOwner) {
      this.throw(403, `You cannot update team owner role`);
    }
  }

  const before = yield TeamUsersDAO.findById(trx, teamUserId);
  try {
    const updated = yield updateTeamUser(trx, {
      before,
      teamId: before.teamId,
      teamUserId,
      actorTeamRole,
      patch: body,
    });

    yield emit<TeamUser, RouteUpdated<TeamUser, typeof teamUserDomain>>({
      type: "route.updated",
      domain: teamUserDomain,
      actorId: actorUserId,
      trx,
      before,
      updated,
    });

    this.body = updated;
    this.status = 200;
  } catch (error) {
    if (error instanceof InsufficientPlanError) {
      this.status = 402;
      const role = check(teamUserUpdateRoleSchema, body)
        ? body.role
        : before.role;
      this.body = yield generateUpgradeBodyDueToUsersLimit(
        trx,
        before.teamId,
        role
      );
      return;
    }
    throw error;
  }
}

function* deleteTeamUser(
  this: TrxContext<AuthedContext<TeamUserUpdate, { teamUser: TeamUser }>>
) {
  const { trx, teamUser, userId: actorUserId } = this.state;

  const isTryingToDeleteTeamOwner = teamUser.role === TeamUserRole.OWNER;
  if (isTryingToDeleteTeamOwner) {
    this.throw(403, `You cannot delete the owner of the team`);
  }

  const deleted = yield removeTeamUser(trx, teamUser);

  yield emit<TeamUser, RouteDeleted<TeamUser, typeof teamUserDomain>>({
    type: "route.deleted",
    domain: teamUserDomain,
    actorId: actorUserId,
    trx,
    deleted,
  });
  this.status = 204;
}

export default {
  prefix: "/team-users",
  routes: {
    "/": {
      post: [
        requireAuth,
        typeGuard(isUnsavedTeamUser),
        requireTeamRoles(
          [TeamUserRole.OWNER, TeamUserRole.ADMIN, TeamUserRole.EDITOR],
          async (context: AuthedContext<{ teamId: string }>) =>
            context.request.body.teamId
        ),
        useTransaction,
        create,
      ],
      get: [
        requireAuth,
        requireQueryParam("teamId"),
        requireTeamRoles(
          Object.values(TeamUserRole),
          async (context: AuthedContext) => context.query.teamId
        ),
        getList,
      ],
    },
    "/:teamUserId": {
      patch: [
        requireAuth,
        useTransaction,
        typeGuardFromSchema(teamUserUpdateSchema),
        requireTeamUserByTeamUserId,
        requireTeamRoles<{ teamUser: TeamUser }>(
          [TeamUserRole.OWNER, TeamUserRole.ADMIN, TeamUserRole.EDITOR],
          findTeamByTeamUser
        ),
        update,
      ],
      del: [
        requireAuth,
        requireTeamUserByTeamUserId,
        requireTeamRoles<{ teamUser: TeamUser }>(
          [TeamUserRole.ADMIN, TeamUserRole.OWNER],
          findTeamByTeamUser,
          {
            allowSelf: async (
              context: AuthedContext,
              actorTeamUserId: string | null
            ) => context.params.teamUserId === actorTeamUserId,
          }
        ),
        useTransaction,
        deleteTeamUser,
      ],
    },
  },
};
