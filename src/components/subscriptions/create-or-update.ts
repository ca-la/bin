import uuid from 'node-uuid';
import Knex from 'knex';

import * as PlansDAO from '../plans/dao';
import * as SubscriptionsDAO from './dao';
import createStripeSubscription from '../../services/stripe/create-subscription';
import createPaymentMethod from '../payment-methods/create-payment-method';
import InvalidDataError = require('../../errors/invalid-data');
import { Subscription } from './domain-object';

interface Options {
  userId: string;
  stripeCardToken: string;
  planId: string;
  subscriptionId?: string;
  trx: Knex.Transaction;
}

export default async function createOrUpdateSubscription(
  options: Options
): Promise<Subscription> {
  const { planId, stripeCardToken, subscriptionId, userId, trx } = options;

  const paymentMethod = await createPaymentMethod({
    token: stripeCardToken,
    userId,
    trx
  });

  const plan = await PlansDAO.findById(planId);
  if (!plan) {
    throw new InvalidDataError(`Invalid plan ID: ${planId}`);
  }

  const stripeSubscription = await createStripeSubscription({
    stripeCustomerId: paymentMethod.stripeCustomerId,
    stripePlanId: plan.stripePlanId,
    stripeSourceId: paymentMethod.stripeSourceId
  });

  let subscription: Subscription;

  if (subscriptionId) {
    subscription = await SubscriptionsDAO.update(
      subscriptionId,
      {
        paymentMethodId: paymentMethod.id,
        planId,
        stripeSubscriptionId: stripeSubscription.id
      },
      trx
    );
  } else {
    subscription = await SubscriptionsDAO.create(
      {
        cancelledAt: null,
        id: uuid.v4(),
        isPaymentWaived: false,
        paymentMethodId: paymentMethod.id,
        planId,
        stripeSubscriptionId: stripeSubscription.id,
        userId
      },
      trx
    );
  }

  return subscription;
}
