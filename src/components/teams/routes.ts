import Knex from "knex";

import { emit } from "../../services/pubsub";
import { RouteCreated } from "../../services/pubsub/cala-events";
import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import TeamsDAO, { rawDao as RawTeamsDAO } from "./dao";
import { isTeamType, isUnsavedTeam, TeamDb, TeamType } from "./types";
import requireAdmin from "../../middleware/require-admin";
import { buildRouter } from "../../services/cala-component/cala-router";
import { createTeamWithOwner } from "./service";
import { requireTeamRoles } from "../team-users/service";
import { Role as TeamUserRole } from "../team-users/types";

const domain = "Team" as "Team";

async function findTeamById(context: TrxContext<AuthedContext>) {
  return context.params.id;
}

function* createTeam(this: TrxContext<AuthedContext>) {
  const { trx, userId: actorId } = this.state;
  const { body } = this.request;

  if (!isUnsavedTeam(body)) {
    this.throw(400, "You must provide a title for the new team");
  }

  const created = yield createTeamWithOwner(trx, body.title, actorId);
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

function searchAndPageModifer(options: {
  offset?: string;
  limit?: string;
  search?: string;
  type?: TeamType;
}) {
  return (query: Knex.QueryBuilder) => {
    query.whereNull("deleted_at");
    query.offset(
      options.offset !== undefined ? parseInt(options.offset, 10) : 0
    );
    query.limit(options.limit !== undefined ? parseInt(options.limit, 10) : 20);
    if (options.search) {
      query.whereRaw("(teams.title ~* ?)", options.search);
    }
    if (options.type) {
      query.where({ "teams.type": options.type });
    }
    return query;
  };
}

enum TeamFilter {
  "UNPAID" = "UNPAID",
}

function isTeamFilter(candidate: any): candidate is TeamFilter {
  return Object.values(TeamFilter).includes(candidate);
}

function* findTeams(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;

  const { userId, search, limit, offset, type, filter } = this.query;

  if (type) {
    if (!isTeamType(type)) {
      this.throw(400, "You must provide a valid team type");
    }
  }

  if (filter && !isTeamFilter(filter)) {
    this.throw(400, `Invalid filter: ${filter}`);
  }

  if (!userId) {
    if (this.state.role === "ADMIN") {
      const modifier = searchAndPageModifer({ limit, offset, search, type });
      this.body =
        filter === TeamFilter.UNPAID
          ? yield RawTeamsDAO.findUnpaidTeams(trx, modifier)
          : yield RawTeamsDAO.find(trx, {}, modifier);

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

  const team = yield RawTeamsDAO.findById(trx, id);
  if (!team) {
    this.throw(404, `Team not found with ID: ${id}`);
  }

  this.body = team;
  this.status = 200;
}

function* deleteTeam(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  const { id } = this.params;

  const { updated: team } = yield RawTeamsDAO.update(trx, id, {
    deletedAt: new Date(),
  });
  if (!team) {
    this.throw(404, `Team not found with ID: ${id}`);
  }

  this.body = team;
  this.status = 200;
}

const standardRouter = buildRouter<TeamDb>("Team", "/teams", RawTeamsDAO, {
  pickRoutes: ["update"],
  routeOptions: {
    update: {
      middleware: [requireAdmin],
      allowedAttributes: ["type"],
    },
  },
});

export default {
  prefix: "/teams",
  routes: {
    "/": {
      post: [useTransaction, requireAuth, createTeam],
      get: [useTransaction, requireAuth, findTeams],
    },
    "/:id": {
      ...standardRouter.routes["/:id"],
      get: [useTransaction, requireAdmin, findTeam],
      del: [
        useTransaction,
        requireTeamRoles(
          [TeamUserRole.ADMIN, TeamUserRole.OWNER],
          findTeamById
        ),
        deleteTeam,
      ],
    },
  },
};
