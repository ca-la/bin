import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as attachSource from '../../services/stripe/attach-source';
import * as createStripeSubscription from '../../services/stripe/create-subscription';
import * as PlansDAO from '../plans/dao';
import * as SubscriptionsDAO from './dao';
import createUser = require('../../test-helpers/create-user');
import db = require('../../services/db');
import PaymentMethodsDAO = require('../payment-methods/dao');
import Session = require('../../domain-objects/session');
import Stripe = require('../../services/stripe');
import User from '../users/domain-object';
import { authHeader, get, post, put } from '../../test-helpers/http';
import { Plan } from '../plans/domain-object';
import { sandbox, test, Test } from '../../test-helpers/fresh';

async function setup(): Promise<{
  session: Session;
  user: User;
  plan: Plan;
}> {
  sandbox()
    .stub(createStripeSubscription, 'default')
    .resolves({
      id: 'sub_123'
    });

  sandbox()
    .stub(attachSource, 'default')
    .resolves({ id: 'sourceId', last4: '1234' });

  sandbox()
    .stub(Stripe, 'findOrCreateCustomerId')
    .resolves('customerId');

  const { session, user } = await createUser();

  const plan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 4567,
    revenueSharePercentage: 50,
    stripePlanId: 'plan_456',
    title: 'Some More',
    isDefault: true
  });

  return { session, user, plan };
}

test('GET /subscriptions lists current subscriptions', async (t: Test) => {
  const { plan, user, session } = await setup();

  const id = await db.transaction(async (trx: Knex.Transaction) => {
    const paymentMethod = await PaymentMethodsDAO.create({
      userId: user.id,
      stripeCustomerId: 'customer1',
      stripeSourceId: 'source1',
      lastFourDigits: '1234'
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: '123',
        userId: user.id,
        isPaymentWaived: false
      },
      trx
    );

    return subscription.id;
  });

  const [res, body] = await get(`/subscriptions?userId=${user.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(res.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, id);
  t.equal(body[0].plan.title, 'Some More');
});

test('POST /subscriptions creates a subscription', async (t: Test) => {
  const { plan, session } = await setup();

  const [res, body] = await post('/subscriptions', {
    headers: authHeader(session.id),
    body: {
      planId: plan.id,
      stripeCardToken: 'tok_123'
    }
  });

  t.equal(res.status, 201);
  t.equal(body.planId, plan.id);
  t.notEqual(body.paymentMethodId, null);
});

test('PUT /subscriptions updates a subscription', async (t: Test) => {
  const { plan, user, session } = await setup();

  let id;
  await db.transaction(async (trx: Knex.Transaction) => {
    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: null,
        stripeSubscriptionId: '123',
        userId: user.id,
        isPaymentWaived: false
      },
      trx
    );

    id = subscription.id;
  });

  const [res, body] = await put(`/subscriptions/${id}`, {
    headers: authHeader(session.id),
    body: {
      planId: plan.id,
      stripeCardToken: 'tok_123'
    }
  });

  t.equal(res.status, 200);
  t.notEqual(body.paymentMethodId, null);
});
