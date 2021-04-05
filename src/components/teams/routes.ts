import Knex from "knex";
import convert from "koa-convert";

import db from "../../services/db";
import { emit } from "../../services/pubsub";
import { RouteCreated } from "../../services/pubsub/cala-events";
import { check } from "../../services/check";
import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import TeamsDAO from "./dao";
import TeamUsersDAO from "../team-users/dao";
import * as SubscriptionsDAO from "../subscriptions/dao";
import * as PlansDAO from "../plans/dao";
import { createSubscription } from "../subscriptions/create";
import attachPlan from "../subscriptions/attach-plan";
import { upgradeTeamSubscription } from "../subscriptions/upgrade";
import {
  TeamDb,
  Team,
  unsavedTeamSchema,
  teamTypeSchema,
  TeamType,
  teamSubscriptionUpgradeSchema,
  TeamSubscriptionUpgrade,
  teamDbSchema,
} from "./types";
import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../middleware/type-guard";
import { buildRouter } from "../../services/cala-component/cala-router";
import { createTeamWithOwner } from "./service";
import {
  requireTeamRoles,
  RequireTeamRolesContext,
} from "../team-users/service";
import { Role as TeamUserRole } from "../team-users/types";
import filterError from "../../services/filter-error";
import InvalidDataError from "../../errors/invalid-data";
import { StrictContext } from "../../router-context";

const domain = "Team" as "Team";

interface FindByTeamRequireTeamRolesContext extends RequireTeamRolesContext {
  params: {
    id: string;
  };
}

async function findTeamById(context: FindByTeamRequireTeamRolesContext) {
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

  this.status = 201;
  this.body = created;
}

function searchAndPageModifer(options: {
  offset?: string;
  limit?: string;
  search?: string;
  type?: TeamType;
}) {
  return (query: Knex.QueryBuilder) => {
    query.whereNull("teams.deleted_at");
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

function* findTeams(this: AuthedContext) {
  const { userId, search, limit, offset, type, filter } = this.query;

  if (type) {
    if (!check(teamTypeSchema, type)) {
      this.throw(400, "You must provide a valid team type");
    }
  }

  if (filter && !isTeamFilter(filter)) {
    this.throw(400, `Invalid filter: ${filter}`);
  }

  const isAdmin = this.state.role === "ADMIN";

  if (!userId) {
    if (!isAdmin) {
      this.throw(400, `You must provide userId as a query parameter`);
    }

    const modifier = searchAndPageModifer({ limit, offset, search, type });

    this.body =
      filter === TeamFilter.UNPAID
        ? yield TeamsDAO.findUnpaidTeams(db, modifier)
        : yield TeamsDAO.find(db, {}, modifier);

    this.status = 200;
    return;
  }

  if (!isAdmin && this.state.userId !== userId) {
    this.throw(
      403,
      "User in query parameter does not match authenticated user"
    );
  }

  this.body = yield TeamsDAO.findByUser(db, userId);
  this.status = 200;
}

function* findTeam(this: WithResponseBody<AuthedContext, Team | TeamDb>) {
  const { id } = this.params;
  const { userId } = this.state;

  const team: TeamDb = yield TeamsDAO.findById(db, id);
  if (!team) {
    this.throw(404, `Team not found with ID: ${id}`);
  }
  const teamUser = yield TeamUsersDAO.findOne(db, {
    teamId: team.id,
    userId,
  });

  this.status = 200;
  if (teamUser) {
    this.body = {
      ...team,
      role: teamUser.role,
      teamUserId: teamUser.id,
    };
  } else {
    this.body = team;
  }
}

function* findTeamSubscriptions(this: AuthedContext) {
  const { isActive } = this.query;
  const { id } = this.params;

  const subscriptions = yield SubscriptionsDAO.findForTeamWithPlans(db, id, {
    isActive: isActive === "true",
  });

  this.body = subscriptions;
  this.status = 200;
}

function* deleteTeam(this: TrxContext<AuthedContext>) {
  const { trx } = this.state;
  const { id } = this.params;

  const deletedTeam = yield TeamsDAO.deleteById(trx, id);
  if (!deletedTeam) {
    this.throw(404, `Team not found with ID: ${id}`);
  }

  this.body = deletedTeam;
  this.status = 200;
}

interface CheckUpdateRightsContext extends StrictContext {
  state: SafeBodyState<Partial<TeamDb>> & AuthedState;
}

const checkUpdateRights = convert.back(
  async (ctx: CheckUpdateRightsContext, next: () => Promise<any>) => {
    if (ctx.state.safeBody.type !== undefined) {
      if (ctx.state.role !== "ADMIN") {
        ctx.throw(403);
      }
    }

    await next();
  }
);

const standardRouter = buildRouter<TeamDb>("Team", "/teams", TeamsDAO, {
  pickRoutes: ["update"],
  routeOptions: {
    update: {
      middleware: [
        requireAuth,
        typeGuardFromSchema<Partial<TeamDb>>(teamDbSchema.partial()),
        checkUpdateRights,
        requireTeamRoles(
          [TeamUserRole.ADMIN, TeamUserRole.OWNER, TeamUserRole.EDITOR],
          findTeamById
        ),
      ],
      allowedAttributes: ["type", "title"],
    },
  },
});

function* upgradeTeamSubscriptionRouteHandler(
  this: TrxContext<AuthedContext<TeamSubscriptionUpgrade>>
): Iterator<any, any, any> {
  const { trx, userId } = this.state;
  const { id: teamId } = this.params;
  const { planId, stripeCardToken } = this.request.body;

  const upgradedSubscription = yield upgradeTeamSubscription(trx, {
    userId,
    teamId,
    planId,
    stripeCardToken: stripeCardToken || null,
  }).catch(
    filterError(InvalidDataError, (err: InvalidDataError) => {
      this.throw(400, err.message);
    })
  );

  const subscriptionWithPlan = yield attachPlan(upgradedSubscription);

  this.body = subscriptionWithPlan;
  this.status = 200;
}

export default {
  prefix: "/teams",
  routes: {
    "/": {
      post: [useTransaction, requireAuth, createTeam],
      get: [requireAuth, findTeams],
    },
    "/:id": {
      ...standardRouter.routes["/:id"],
      get: [
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
    "/:id/subscriptions": {
      get: [
        requireAuth,
        requireTeamRoles(Object.values(TeamUserRole), findTeamById),
        findTeamSubscriptions,
      ],
    },
    "/:id/subscription": {
      patch: [
        useTransaction,
        requireAuth,
        typeGuardFromSchema(teamSubscriptionUpgradeSchema),
        requireTeamRoles([TeamUserRole.OWNER], findTeamById),
        upgradeTeamSubscriptionRouteHandler,
      ],
    },
  },
};
