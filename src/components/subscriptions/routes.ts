import Knex from 'knex';
import Router from 'koa-router';

import * as SubscriptionsDAO from './dao';
import attachPlan from './attach-plan';
import canAccessUserResource = require('../../middleware/can-access-user-resource');
import createOrUpdateSubscription from './create-or-update';
import db from '../../services/db';
import requireAuth = require('../../middleware/require-auth');
import { hasProperties } from '../../services/require-properties';
import { Subscription } from './domain-object';

interface CreateOrUpdateRequest {
  planId: string;
  stripeCardToken?: string;
  userId?: string;
  isPaymentWaived?: boolean;
}

function isCreateOrUpdateRequest(body: any): body is CreateOrUpdateRequest {
  return hasProperties(body, 'planId');
}

const router = new Router();

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const { userId, isActive } = this.query;

  if (!userId) {
    this.throw(400, 'User ID is required');
  }

  canAccessUserResource.call(this, userId);

  const findOnlyActive = isActive === 'true';

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
  this.status = 200;
}

function* create(this: AuthedContext): Iterator<any, any, any> {
  const isAdmin = this.state.role === 'ADMIN';
  const { body } = this.request;
  if (!isCreateOrUpdateRequest(body)) {
    this.throw(400, 'Missing required properties');
  }

  const { stripeCardToken, planId } = body;

  if (!isAdmin) {
    if (body.userId) {
      this.throw(
        403,
        'Subscriptions can only be created for the logged in user'
      );
    }
    if (body.isPaymentWaived) {
      this.throw(403, 'Payment cannot be waived');
    }
    if (!stripeCardToken) {
      this.throw(400, 'Stripe card token is required');
    }
  }

  const userId = isAdmin && body.userId ? body.userId : this.state.userId;

  const subscription = yield db.transaction((trx: Knex.Transaction) => {
    return createOrUpdateSubscription({
      stripeCardToken,
      planId,
      userId,
      isPaymentWaived: isAdmin && body.isPaymentWaived,
      trx
    });
  });

  this.body = yield attachPlan(subscription);
  this.status = 201;
}

function* update(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;
  if (!isCreateOrUpdateRequest(body)) {
    this.throw(400, 'Missing required properties');
  }

  const { subscriptionId } = this.params;
  const { stripeCardToken, planId } = body;
  if (!stripeCardToken) {
    this.throw(400, 'Missing stripe card token');
  }
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

router.get('/', requireAuth, getList);
router.post('/', requireAuth, create);
router.put('/:subscriptionId', requireAuth, update);

export default router.routes();
