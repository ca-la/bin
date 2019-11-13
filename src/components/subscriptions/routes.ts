import * as Knex from 'knex';
import * as Koa from 'koa';
import * as Router from 'koa-router';

import * as SubscriptionsDAO from './dao';
import attachPlan from './attach-plan';
import canAccessUserResource = require('../../middleware/can-access-user-resource');
import createOrUpdateSubscription from './create-or-update';
import db = require('../../services/db');
import requireAuth = require('../../middleware/require-auth');
import { hasProperties } from '../../services/require-properties';
import { Subscription } from './domain-object';

interface CreateOrUpdateRequest {
  planId: string;
  stripeCardToken: string;
}

function isCreateOrUpdateRequest(body: any): body is CreateOrUpdateRequest {
  return hasProperties(body, 'planId', 'stripeCardToken');
}

const router = new Router();

function* listForUser(this: Koa.Application.Context): Iterator<any, any, any> {
  const { userId } = this.query;

  if (!userId) {
    this.throw(400, 'User ID is required');
    return;
  }

  canAccessUserResource.call(this, userId);

  const subscriptionsWithPlans = yield db.transaction(
    async (trx: Knex.Transaction) => {
      const subscriptions = await SubscriptionsDAO.findForUser(userId, trx);
      return await Promise.all(
        subscriptions.map((subscription: Subscription) =>
          attachPlan(subscription)
        )
      );
    }
  );

  this.body = subscriptionsWithPlans;
  this.status = 200;
}

function* create(this: Koa.Application.Context): Iterator<any, any, any> {
  const { body } = this.request;
  if (!isCreateOrUpdateRequest(body)) {
    return this.throw(400, 'Missing required properties');
  }

  const { stripeCardToken, planId } = body;

  const subscription = yield db.transaction((trx: Knex.Transaction) => {
    return createOrUpdateSubscription({
      stripeCardToken,
      planId,
      userId: this.state.userId,
      trx
    });
  });

  this.body = yield attachPlan(subscription);
  this.status = 201;
}

function* update(this: Koa.Application.Context): Iterator<any, any, any> {
  const { body } = this.request;
  if (!isCreateOrUpdateRequest(body)) {
    return this.throw(400, 'Missing required properties');
  }

  const { subscriptionId } = this.params;
  const { stripeCardToken, planId } = body;

  const updated = yield db.transaction((trx: Knex.Transaction) => {
    return createOrUpdateSubscription({
      stripeCardToken,
      planId,
      userId: this.state.userId,
      subscriptionId,
      trx
    });
  });

  this.body = updated;
  this.status = 200;
}

router.get('/', requireAuth, listForUser);
router.post('/', requireAuth, create);
router.put('/:subscriptionId', requireAuth, update);

export default router.routes();
