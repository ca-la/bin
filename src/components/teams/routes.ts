import Knex from "knex";

import { emit } from "../../services/pubsub";
import { RouteCreated } from "../../services/pubsub/cala-events";
import { check } from "../../services/check";
import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import TeamsDAO from "./dao";
import * as PlansDAO from "../plans/dao";
import { createSubscription } from "../subscriptions/create";
import { TeamDb, unsavedTeamSchema, teamTypeSchema, TeamType } from "./types";
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
  const parsed = unsavedTeamSchema.safeParse(body);

  if (!parsed.success) {
    this.throw(400, "You must provide a title for the new team");
  }

  const unsavedTeam = parsed.data;

  const created = yield createTeamWithOwner(trx, unsavedTeam.title, actorId);

  // subscribe team to a free plan or don't if default plan is not free
  const freeDefaultPlan = yield PlansDAO.findFreeAndDefaultForTeams(trx);
  if (freeDefaultPlan) {
    yield createSubscription(trx, {
      teamId: created.id,
      planId: freeDefaultPlan.id,
      userId: actorId,
      stripeCardToken: null,
      isPaymentWaived: false,
    });
  }

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
    if (!check(teamTypeSchema, type)) {
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
          ? yield TeamsDAO.findUnpaidTeams(trx, modifier)
          : yield TeamsDAO.find(trx, {}, modifier);

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

  this.body = yield TeamsDAO.findByUser(trx, userId);
  this.status = 200;
}

function* findTeam(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  const { id } = this.params;

  const team = yield TeamsDAO.findById(trx, id);
  if (!team) {
    this.throw(404, `Team not found with ID: ${id}`);
  }

  this.body = team;
  this.status = 200;
}

function* deleteTeam(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  const { id } = this.params;

  const { updated: team } = yield TeamsDAO.update(trx, id, {
    deletedAt: new Date(),
  });
  if (!team) {
    this.throw(404, `Team not found with ID: ${id}`);
  }

  this.body = team;
  this.status = 200;
}

function* checkUpdateRights(
  this: TrxContext<AuthedContext<any, { actorTeamRole?: TeamUserRole }>>,
  next: () => Promise<any>
) {
  if (this.request.body.hasOwnProperty("type")) {
    return yield requireAdmin.call(this, next);
  }

  yield requireTeamRoles(
    [TeamUserRole.ADMIN, TeamUserRole.OWNER, TeamUserRole.EDITOR],
    findTeamById
  ).call(this, next);
}

const standardRouter = buildRouter<TeamDb>("Team", "/teams", TeamsDAO, {
  pickRoutes: ["update"],
  routeOptions: {
    update: {
      middleware: [requireAuth, checkUpdateRights],
      allowedAttributes: ["type", "title"],
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
      get: [
        useTransaction,
        requireAuth,
        requireTeamRoles(Object.values(TeamUserRole), findTeamById),
        findTeam,
      ],
      del: [
        useTransaction,
        requireAuth,
        requireTeamRoles(
          [TeamUserRole.ADMIN, TeamUserRole.OWNER],
          findTeamById
        ),
        deleteTeam,
      ],
    },
  },
};
