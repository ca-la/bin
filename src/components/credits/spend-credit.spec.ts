import Knex from 'knex';

import db from '../../services/db';
import createUser = require('../../test-helpers/create-user');
import generateInvoice from '../../test-helpers/factories/invoice';
import spendCredit from './spend-credit';
import { addCredit, getCreditAmount } from './dao';
import { test, Test } from '../../test-helpers/fresh';

test('spendCredit spends the available amount', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { invoice } = await generateInvoice();

  await db.transaction(async (trx: Knex.Transaction) => {
    await addCredit(
      {
        amountCents: 1230,
        createdBy: user.id,
        description: 'For being a good customer',
        expiresAt: null,
        givenTo: user.id
      },
      trx
    );

    const result = await spendCredit(user.id, invoice, trx);

    t.equal(result.creditPaymentAmount, 1230);
    t.equal(result.nonCreditPaymentAmount, 4);
    t.equal(await getCreditAmount(user.id, trx), 0);
  });
});

test('spendCredit spends all if more credit is available', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { invoice } = await generateInvoice();

  await db.transaction(async (trx: Knex.Transaction) => {
    await addCredit(
      {
        amountCents: 9999,
        createdBy: user.id,
        description: 'For being a good customer',
        expiresAt: null,
        givenTo: user.id
      },
      trx
    );

    const result = await spendCredit(user.id, invoice, trx);

    t.equal(result.creditPaymentAmount, 1234);
    t.equal(result.nonCreditPaymentAmount, 0);
    t.equal(await getCreditAmount(user.id, trx), 8765);
  });
});

test('spendCredit spends none if none is available', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { invoice } = await generateInvoice();

  await db.transaction(async (trx: Knex.Transaction) => {
    const result = await spendCredit(user.id, invoice, trx);

    t.equal(result.creditPaymentAmount, 0);
    t.equal(result.nonCreditPaymentAmount, 1234);
    t.equal(await getCreditAmount(user.id, trx), 0);
  });
});
