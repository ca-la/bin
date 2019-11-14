import Knex from 'knex';

import PaymentMethodsDAO from './dao';
import db from '../../services/db';
import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');

test('PaymentMethodsDAO.findByUserId', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: 'cus_123',
    stripeSourceId: 'sou_123',
    lastFourDigits: '1234'
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const methods = await PaymentMethodsDAO.findByUserId(user.id, trx);
    t.equal(methods.length, 1);
    t.equal(methods[0].stripeSourceId, 'sou_123');
  });
});
