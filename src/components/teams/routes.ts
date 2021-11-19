import Knex from "knex";
import convert from "koa-convert";
import { z } from "zod";

import db from "../../services/db";
import { emit } from "../../services/pubsub";
import { RouteCreated } from "../../services/pubsub/cala-events";
import { check } from "../../services/check";
import useTransaction from "../../middleware/use-transaction";
import requireAuth from "../../middleware/require-auth";
import TeamsDAO from "./dao";
import TeamUsersDAO from "../team-users/dao";
import * as SubscriptionsDAO from "../subscriptions/dao";
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
  SubscriptionUpdateDetails,
  teamUpdateRequest,
} from "./types";
import { typeGuardFromSchema } from "../../middleware/type-guard";
import { createTeamWithOwnerAndSubscription } from "./service";
import {
  requireTeamRoles,
  RequireTeamRolesContext,
} from "../team-users/service";
import { Role as TeamUserRole } from "../team-users/types";
import filterError from "../../services/filter-error";
import InvalidDataError from "../../errors/invalid-data";
import { StrictContext } from "../../router-context";
import { getTeamSubscriptionUpdateDetails } from "../subscriptions/get-update-details";
import { parseContext } from "../../services/parse-context";
import ResourceNotFoundError from "../../errors/resource-not-found";

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

  const created = yield createTeamWithOwnerAndSubscription(
    trx,
    { title: unsavedTeam.title },
    actorId
  );

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
      teamOrdering: teamUser.teamOrdering,
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

interface UpdateTeamBody {
  title: string;
  type: string;
}

interface UpdateContext extends StrictContext<UpdateTeamBody> {
  state: AuthedState;
}

async function updateTeam(ctx: UpdateContext) {
  const {
    request: { body },
    params: { id },
  } = parseContext(ctx, teamUpdateRequest);

  const { userId } = ctx.state;

  if (body.hasOwnProperty("type") && ctx.state.role !== "ADMIN") {
    ctx.throw(403);
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const { updated } = await TeamsDAO.update(trx, id, body).catch(
      filterError(ResourceNotFoundError, (err: ResourceNotFoundError) => {
        ctx.throw(404, err.message);
      })
    );

    const teamUser = await TeamUsersDAO.findOne(db, { teamId: id, userId });

    if (teamUser) {
      ctx.body = {
        ...updated,
        role: teamUser.role,
        teamUserId: teamUser.id,
        teamOrdering: teamUser.teamOrdering,
      };
    } else {
      ctx.body = updated;
    }

    ctx.status = 200;
  });
}

function* upgradeTeamSubscriptionRouteHandler(
  this: TrxContext<AuthedContext<TeamSubscriptionUpgrade>>
): Iterator<any, any, any> {
  const { trx } = this.state;
  const { id: teamId } = this.params;
  const { planId, stripeCardToken } = this.request.body;

  const upgradedSubscription = yield upgradeTeamSubscription(trx, {
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

const getUpgradeDetailsQuerySchema = z.object({
  planId: z.string(),
});

interface GetUpgradeDetailsContext
  extends StrictContext<SubscriptionUpdateDetails> {
  params: { id: string };
}

async function getSubscriptionUpdateDetails(ctx: GetUpgradeDetailsContext) {
  const queryResult = getUpgradeDetailsQuerySchema.safeParse(ctx.query);
  ctx.assert(queryResult.success, 400, "Must pass new plan ID in query");
  const {
    data: { planId },
  } = queryResult;
  const { id: teamId } = ctx.params;

  return db.transaction(async (trx: Knex.Transaction) => {
    const updateDetails = await getTeamSubscriptionUpdateDetails(trx, {
      teamId,
      planId,
    });

    ctx.body = updateDetails;
    ctx.status = 200;
  });
}

export default {
  prefix: "/teams",
  routes: {
    "/": {
      post: [useTransaction, requireAuth, createTeam],
      get: [requireAuth, findTeams],
    },
    "/:id": {
      patch: [
        requireAuth,
        requireTeamRoles(
          [TeamUserRole.ADMIN, TeamUserRole.OWNER, TeamUserRole.EDITOR],
          findTeamById
        ),
        convert.back(updateTeam),
      ],
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
      get: [
        requireAuth,
        requireTeamRoles(
          [TeamUserRole.EDITOR, TeamUserRole.ADMIN, TeamUserRole.OWNER],
          findTeamById
        ),
        convert.back(getSubscriptionUpdateDetails),
      ],
      patch: [
        useTransaction,
        requireAuth,
        typeGuardFromSchema(teamSubscriptionUpgradeSchema),
        requireTeamRoles(
          [TeamUserRole.EDITOR, TeamUserRole.ADMIN, TeamUserRole.OWNER],
          findTeamById
        ),
        upgradeTeamSubscriptionRouteHandler,
      ],
    },
  },
};
