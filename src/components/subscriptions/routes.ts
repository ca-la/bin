import Knex from "knex";
import Router from "koa-router";

import * as SubscriptionsDAO from "./dao";
import attachPlan from "./attach-plan";
import canAccessUserResource = require("../../middleware/can-access-user-resource");
import db from "../../services/db";
import requireAuth = require("../../middleware/require-auth");
import { hasProperties } from "../../services/require-properties";
import { Subscription } from "./types";
import requireAdmin from "../../middleware/require-admin";

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
router.patch("/:subscriptionId", requireAdmin, update);

export default router.routes();
