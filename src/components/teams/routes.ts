import uuid from "node-uuid";
import Knex from "knex";

import { emit } from "../../services/pubsub";
import { RouteCreated } from "../../services/pubsub/cala-events";
import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import { requireQueryParam } from "../../middleware/require-query-param";
import TeamsDAO, { rawDao as RawTeamsDAO } from "./dao";
import { isUnsavedTeam, TeamDb } from "./types";

const domain = "Team" as "Team";

function* createTeam(this: TrxContext<AuthedContext>) {
  const { trx, userId: actorId } = this.state;
  const { body } = this.request;

  if (!isUnsavedTeam(body)) {
    this.throw(400, "You must provide a title for the new team");
  }

  const toCreate = {
    id: uuid.v4(),
    title: body.title,
    createdAt: new Date(),
    deletedAt: null,
  };

  const created = yield RawTeamsDAO.create(trx, toCreate);
  yield emit<TeamDb, RouteCreated<TeamDb, typeof domain>>({
    type: "route.created",
    domain,
    actorId,
    trx,
    created,
  });

  const team = yield TeamsDAO.findById(trx, created.id);

  this.status = 201;
  this.body = team;
}

function* findTeamsByUser(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  if (this.state.userId !== this.query.userId) {
    this.throw(
      403,
      "User in query parameter does not match authenticated user"
    );
  }

  const teams = yield TeamsDAO.find(trx, {}, (query: Knex.QueryBuilder) =>
    query.where({
      "team_users.user_id": this.query.userId,
    })
  );

  this.body = teams;
  this.status = 200;
}

export default {
  prefix: "/teams",
  routes: {
    "/": {
      post: [useTransaction, requireAuth, createTeam],
      get: [
        useTransaction,
        requireAuth,
        requireQueryParam("userId"),
        findTeamsByUser,
      ],
    },
  },
};
