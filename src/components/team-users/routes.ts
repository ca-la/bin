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
} from "./types";
import { createTeamUser, requireTeamRoles } from "./service";
import TeamUsersDAO from "./dao";

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

export default {
  prefix: "/team-users",
  routes: {
    "/": {
      post: [
        useTransaction,
        requireAuth,
        typeGuard(isUnsavedTeamUser),
        requireTeamRoles(
          [TeamUserRole.ADMIN, TeamUserRole.EDITOR],
          async (context: AuthedContext<{ teamId: string }>) =>
            context.request.body.teamId
        ),
        create,
      ],
      get: [
        useTransaction,
        requireAuth,
        requireQueryParam("teamId"),
        requireTeamRoles(
          Object.values(TeamUserRole),
          async (context: AuthedContext) => context.query.teamId
        ),
        getList,
      ],
    },
  },
};
