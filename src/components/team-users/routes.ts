import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";

import filterError from "../../services/filter-error";
import UnauthorizedError from "../../errors/unauthorized";
import ResourceNotFoundError from "../../errors/resource-not-found";
import InvalidDataError from "../../errors/invalid-data";

import {
  isUnsavedTeamUser,
  UnsavedTeamUser,
  Role as TeamUserRole,
} from "./types";
import { createTeamUser, requireTeamRoles } from "./service";
import TeamUsersDAO from "./dao";
import { requireQueryParam } from "../../middleware/require-query-param";

function* create(
  this: TrxContext<
    AuthedContext<UnsavedTeamUser, { actorTeamRole: TeamUserRole }>
  >
) {
  const { body } = this.request;
  const { trx, actorTeamRole } = this.state;

  if (!isUnsavedTeamUser(body)) {
    throw new InvalidDataError(
      "You must provide the following data: teamId, userEmail, role"
    );
  }

  this.body = yield createTeamUser(trx, actorTeamRole, body)
    .catch(
      filterError(UnauthorizedError, (error: UnauthorizedError) => {
        this.throw(403, error.message);
      })
    )
    .catch(
      filterError(ResourceNotFoundError, (error: ResourceNotFoundError) => {
        this.throw(404, error.message);
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
        requireTeamRoles([TeamUserRole.ADMIN, TeamUserRole.EDITOR]),
        create,
      ],
      get: [
        useTransaction,
        requireAuth,
        requireTeamRoles(Object.values(TeamUserRole)),
        requireQueryParam("teamId"),
        getList,
      ],
    },
  },
};
