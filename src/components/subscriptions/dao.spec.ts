import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import db = require('../../services/db');
import * as SubscriptionsDAO from './dao';
import * as PlansDAO from '../plans/dao';
import * as PaymentMethodsDAO from '../payment-methods/dao';

test('SubscriptionsDAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const plan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 4567,
    revenueSharePercentage: 50,
    stripePlanId: 'plan_456',
    title: 'Some More',
    isDefault: true
  });

  const paymentMethod = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: 'customer1',
    stripeSourceId: 'source1',
    lastFourDigits: '1234'
  });

  await db.transaction(async (trx: Knex.Transaction) => {
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

    const found = await SubscriptionsDAO.findForUser(user.id, trx);
    t.equal(found.length, 1);
    t.equal(found[0].id, subscription.id);
  });
});

test('SubscriptionsDAO supports updating', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const plan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 4567,
    revenueSharePercentage: 50,
    stripePlanId: 'plan_456',
    title: 'Some More',
    isDefault: true
  });

  const pm1 = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: 'customer1',
    stripeSourceId: 'source1',
    lastFourDigits: '1234'
  });

  const pm2 = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: 'customer1',
    stripeSourceId: 'source1',
    lastFourDigits: '1234'
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: pm1.id,
        stripeSubscriptionId: '123',
        userId: user.id,
        isPaymentWaived: false
      },
      trx
    );

    const updated = await SubscriptionsDAO.update(
      subscription.id,
      {
        paymentMethodId: pm2.id
      },
      trx
    );

    t.equal(updated.paymentMethodId, pm2.id);
  });
});
