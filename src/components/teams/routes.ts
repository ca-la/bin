import uuid from "node-uuid";
import Knex from "knex";

import requireAuth from "../../middleware/require-auth";

import { buildRouter } from "../../services/cala-component/cala-router";
import useTransaction from "../../middleware/use-transaction";
import { requireQueryParam } from "../../middleware/require-query-param";
import InvalidDataError from "../../errors/invalid-data";

import TeamsDAO from "./dao";
import { isUnsavedTeam, Team } from "./types";

const standardRouter = buildRouter("Team" as const, "/teams", TeamsDAO, {
  pickRoutes: ["create"],
  routeOptions: {
    create: {
      middleware: [requireAuth],
      getModelFromBody: async (
        _: Knex.Transaction,
        body: Record<string, any>
      ): Promise<Team> => {
        if (!isUnsavedTeam(body)) {
          throw new InvalidDataError(
            "You must provide a title for the new team"
          );
        }

        return {
          id: uuid.v4(),
          title: body.title,
          createdAt: new Date(),
          deletedAt: null,
        };
      },
    },
  },
});

function* findTeamsByUser(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  if (this.state.userId !== this.query.userId) {
    this.throw(
      403,
      "User in query parameter does not match authenticated user"
    );
  }

  const teams = yield TeamsDAO.findByUser(trx, this.query.userId);

  this.body = teams;
  this.status = 200;
}

export default {
  ...standardRouter,
  routes: {
    ...standardRouter.routes,
    "/": {
      ...standardRouter.routes["/"],
      get: [useTransaction, requireQueryParam("userId"), findTeamsByUser],
    },
  },
};
