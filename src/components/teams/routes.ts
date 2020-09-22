import uuid from "node-uuid";
import Knex from "knex";

import { emit } from "../../services/pubsub";
import { RouteCreated } from "../../services/pubsub/cala-events";
import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import TeamsDAO, { rawDao as RawTeamsDAO } from "./dao";
import { isTeamType, isUnsavedTeam, TeamDb, TeamType } from "./types";
import requireAdmin from "../../middleware/require-admin";

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
    type: TeamType.DESIGNER,
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

function* findTeams(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;

  const { userId, search, limit, offset, type } = this.query;

  if (type) {
    if (!isTeamType(type)) {
      this.throw(400, "You must provide a valid team type");
    }
  }

  if (!userId) {
    if (this.state.role === "ADMIN") {
      this.body = yield RawTeamsDAO.find(
        trx,
        {},
        (query: Knex.QueryBuilder) => {
          query.whereNull("deleted_at");
          query.offset(offset !== undefined ? parseInt(offset, 10) : 0);
          query.limit(limit !== undefined ? parseInt(limit, 10) : 20);
          if (search) {
            query.whereRaw("(teams.title ~* ?)", search);
          }
          if (type) {
            query.where({ type });
          }
          return query;
        }
      );
      this.status = 200;
      return;
    }

    this.throw(400, `You must provide userId as a query parameter`);
  }

  if (this.state.userId !== userId) {
    this.throw(
      403,
      "User in query parameter does not match authenticated user"
    );
  }

  this.body = yield TeamsDAO.find(trx, {}, (query: Knex.QueryBuilder) =>
    query.where({
      "team_users.user_id": userId,
    })
  );
  this.status = 200;
}

function* findTeam(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  const { id } = this.params;

  const team = yield RawTeamsDAO.findOne(trx, { id });
  if (!team) {
    this.throw(404, `Team not found with ID: ${id}`);
  }

  this.body = team;
  this.status = 200;
}

export default {
  prefix: "/teams",
  routes: {
    "/": {
      post: [useTransaction, requireAuth, createTeam],
      get: [useTransaction, requireAuth, findTeams],
    },
    "/:id": {
      get: [useTransaction, requireAdmin, findTeam],
    },
  },
};
