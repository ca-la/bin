import Knex from "knex";
import Router from "koa-router";

import * as SubscriptionsDAO from "./dao";
import attachPlan from "./attach-plan";
import canAccessUserResource = require("../../middleware/can-access-user-resource");
import { createSubscription } from "./create";
import db from "../../services/db";
import requireAuth = require("../../middleware/require-auth");
import { hasProperties } from "../../services/require-properties";
import { Subscription } from "./domain-object";
import filterError from "../../services/filter-error";
import InvalidDataError from "../../errors/invalid-data";
import requireAdmin from "../../middleware/require-admin";

interface CreateOrUpdateRequest {
  planId: string;
  stripeCardToken?: string;
  userId?: string;
  teamId?: string;
  isPaymentWaived?: boolean;
}

function isCreateOrUpdateRequest(body: any): body is CreateOrUpdateRequest {
  return hasProperties(body, "planId");
}

function isUpdateRequest(body: any): body is { cancelledAt: Date } {
  return hasProperties(body, "cancelledAt");
}

const router = new Router();

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const { userId, isActive, teamId } = this.query;

  if (!userId && !teamId) {
    this.throw(400, "User or Team ID is required");
  }

  if (userId) {
    canAccessUserResource.call(this, userId);
    const findOnlyActive = isActive === "true";

    const subscriptionsWithPlans = yield db.transaction(
      async (trx: Knex.Transaction) => {
        let subscriptions: Subscription[];

        if (findOnlyActive) {
          subscriptions = await SubscriptionsDAO.findActive(userId, trx);
        } else {
          subscriptions = await SubscriptionsDAO.findForUser(userId, trx);
        }

        return await Promise.all(
          subscriptions.map((subscription: Subscription) =>
            attachPlan(subscription)
          )
        );
      }
    );
    this.body = subscriptionsWithPlans;
  } else {
    if (this.state.role !== "ADMIN") {
      this.throw(403);
    }

    this.body = yield db.transaction(async (trx: Knex.Transaction) =>
      SubscriptionsDAO.findForTeamWithPlans(trx, teamId)
    );
  }

  this.status = 200;
}

function* create(this: AuthedContext): Iterator<any, any, any> {
  const isAdmin = this.state.role === "ADMIN";
  const { body } = this.request;
  if (!isCreateOrUpdateRequest(body)) {
    this.throw(400, "Missing required properties");
  }

  const { stripeCardToken, planId } = body;

  if (!isAdmin) {
    if (body.userId) {
      this.throw(
        403,
        "Subscriptions can only be created for the logged in user"
      );
    }
    if (body.isPaymentWaived) {
      this.throw(403, "Payment cannot be waived");
    }
  }

  const userId = isAdmin && body.userId ? body.userId : this.state.userId;

  const subscription = yield db.transaction((trx: Knex.Transaction) => {
    return createSubscription(trx, {
      stripeCardToken: stripeCardToken || null,
      planId,
      userId,
      teamId: body.teamId || null,
      isPaymentWaived: Boolean(isAdmin && body.isPaymentWaived),
    }).catch(
      filterError(InvalidDataError, (err: InvalidDataError) =>
        this.throw(400, err)
      )
    );
  });

  this.body = yield attachPlan(subscription);
  this.status = 201;
}

function* update(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;
  if (!isUpdateRequest(body)) {
    this.throw(400, "Missing required properties");
  }

  const { subscriptionId } = this.params;

  const updated = yield db.transaction((trx: Knex.Transaction) => {
    return SubscriptionsDAO.update(
      subscriptionId,
      {
        cancelledAt: new Date(body.cancelledAt),
      },
      trx
    );
  });

  this.body = updated;
  this.status = 200;
}

router.get("/", requireAuth, getList);
router.post("/", requireAuth, create);
router.patch("/:subscriptionId", requireAdmin, update);

export default router.routes();
