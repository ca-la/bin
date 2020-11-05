import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import { requireQueryParam } from "../../middleware/require-query-param";
import { typeGuard } from "../../middleware/type-guard";

import filterError from "../../services/filter-error";
import UnauthorizedError from "../../errors/unauthorized";

import {
  isUnsavedTeamUser,
  UnsavedTeamUser,
  Role as TeamUserRole,
  isTeamUserRole,
  TeamUserUpdate,
  isTeamUserUpdate,
} from "./types";
import { createTeamUser, requireTeamRoles, updateTeamUser } from "./service";
import TeamUsersDAO from "./dao";

async function findTeamByTeamUserId(context: TrxContext<AuthedContext>) {
  const teamUser = await TeamUsersDAO.findById(
    context.state.trx,
    context.params.teamUserId
  );
  if (!teamUser) {
    return context.throw(
      `Could not find team user ${context.params.teamUserId}`,
      404
    );
  }
  return teamUser.teamId;
}

function* create(
  this: TrxContext<
    AuthedContext<UnsavedTeamUser, { actorTeamRole: TeamUserRole }>
  >
) {
  const { body } = this.request;
  const { trx, actorTeamRole } = this.state;

  this.body = yield createTeamUser(trx, actorTeamRole, body).catch(
    filterError(UnauthorizedError, (error: UnauthorizedError) => {
      this.throw(403, error.message);
    })
  );
  this.status = 201;
}

function* getList(this: TrxContext<AuthedContext>) {
  const { teamId } = this.request.query;
  const { trx } = this.state;

  this.body = yield TeamUsersDAO.find(trx, { teamId });
  this.status = 200;
}

function* update(
  this: TrxContext<
    AuthedContext<TeamUserUpdate, { actorTeamRole: TeamUserRole }>
  >
) {
  const { trx, actorTeamRole } = this.state;
  const { teamUserId } = this.params;
  const { body } = this.request;

  if (!isTeamUserUpdate(body)) {
    this.throw("Update can only include role", 403);
  }
  if (!isTeamUserRole(body.role)) {
    this.throw(`Invalid team user role: ${body.role}`, 403);
  }

  this.body = yield updateTeamUser(trx, teamUserId, actorTeamRole, body);
  this.status = 200;
}

function* deleteTeamUser(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  const { teamUserId } = this.params;
  yield TeamUsersDAO.deleteById(trx, teamUserId);
  this.status = 204;
}

export default {
  prefix: "/team-users",
  routes: {
    "/": {
      post: [
        requireAuth,
        typeGuard(isUnsavedTeamUser),
        useTransaction,
        requireTeamRoles(
          [TeamUserRole.OWNER, TeamUserRole.ADMIN, TeamUserRole.EDITOR],
          async (context: AuthedContext<{ teamId: string }>) =>
            context.request.body.teamId
        ),
        create,
      ],
      get: [
        requireAuth,
        requireQueryParam("teamId"),
        useTransaction,
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
        requireTeamRoles(Object.values(TeamUserRole), findTeamByTeamUserId),
        update,
      ],
      del: [
        requireAuth,
        useTransaction,
        requireTeamRoles(
          [TeamUserRole.ADMIN, TeamUserRole.OWNER],
          findTeamByTeamUserId,
          { allowSelf: true }
        ),
        deleteTeamUser,
      ],
    },
  },
};
