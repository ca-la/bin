import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";

import filterError from "../../services/filter-error";
import UnauthorizedError from "../../errors/unauthorized";
import ResourceNotFoundError from "../../errors/resource-not-found";
import InvalidDataError from "../../errors/invalid-data";

import { isUnsavedTeamUser } from "./types";
import { createTeamUser } from "./service";

function* create(this: TrxContext<AuthedContext>) {
  const { body } = this.request;
  const { trx, userId } = this.state;

  if (!isUnsavedTeamUser(body)) {
    throw new InvalidDataError(
      "You must provide the following data: teamId, userEmail, role"
    );
  }

  this.body = yield createTeamUser(trx, userId, body)
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

export default {
  prefix: "/team-users",
  routes: {
    "/": {
      post: [useTransaction, requireAuth, create],
    },
  },
};
