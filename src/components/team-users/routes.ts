import db from "../../services/db";
import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import { requireQueryParam } from "../../middleware/require-query-param";
import { typeGuard } from "../../middleware/type-guard";

import filterError from "../../services/filter-error";
import UnauthorizedError from "../../errors/unauthorized";
import InsufficientPlanError from "../../errors/insufficient-plan";

import {
  isUnsavedTeamUser,
  UnsavedTeamUser,
  Role as TeamUserRole,
  isTeamUserRole,
  TeamUserUpdate,
  isTeamUserUpdate,
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
  const { trx, actorTeamRole, userId: actorUserId, role } = this.state;

  const isAdmin = role === "ADMIN";
  const created = yield createTeamUser(trx, actorTeamRole, body, isAdmin)
    .catch(
      filterError(UnauthorizedError, (error: UnauthorizedError) => {
        this.throw(403, error.message);
      })
    )
    .catch(
      filterError(InsufficientPlanError, (error: InsufficientPlanError) =>
        this.throw(402, error.message)
      )
    );

  yield emit<TeamUser, RouteCreated<TeamUser, typeof teamUserDomain>>({
    type: "route.created",
    domain: teamUserDomain,
    actorId: actorUserId,
    trx,
    created,
  });

  this.body = created;
  this.status = 201;
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

  if (!isTeamUserUpdate(body)) {
    this.throw(403, "Update can only include role");
  }
  if (!isTeamUserRole(body.role)) {
    this.throw(403, `Invalid team user role: ${body.role}`);
  }

  const isTryingToUpdateTeamOwner = teamUser.role === TeamUserRole.OWNER;
  if (isTryingToUpdateTeamOwner) {
    this.throw(403, `You cannot update team owner role`);
  }

  const before = yield TeamUsersDAO.findById(trx, teamUserId);
  const updated = yield updateTeamUser(trx, {
    before,
    teamId: before.teamId,
    teamUserId,
    actorTeamRole,
    patch: body,
    isAdmin: this.state.role === "ADMIN",
  }).catch(
    filterError(InsufficientPlanError, (error: InsufficientPlanError) =>
      this.throw(402, error.message)
    )
  );

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
        requireTeamUserByTeamUserId,
        requireTeamRoles<{ teamUser: TeamUser }>(
          Object.values(TeamUserRole),
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
