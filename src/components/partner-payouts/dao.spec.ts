import * as uuid from 'node-uuid';
import { test, Test } from '../../test-helpers/fresh';
import { omit } from 'lodash';

import { create, findByPayoutAccountId, findByUserId } from './dao';
import PayoutAccountsDAO = require('../../dao/partner-payout-accounts');
import createUser = require('../../test-helpers/create-user');
import generateInvoice from '../../test-helpers/factories/invoice';

test('can create a payout log and find the logs', async (t: Test) => {
  const { user: admin } = await createUser({
    role: 'ADMIN',
    withSession: false
  });
  const { user } = await createUser({ role: 'PARTNER', withSession: false });

  const payoutAccount = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: user.id,
    stripeAccessToken: 'stripe-access-one',
    stripeRefreshToken: 'stripe-refresh-one',
    stripePublishableKey: 'stripe-publish-one',
    stripeUserId: 'stripe-user-one'
  });

  const { collection, invoice } = await generateInvoice();

  const data = {
    id: uuid.v4(),
    invoiceId: invoice.id,
    payoutAccountId: payoutAccount.id,
    payoutAmountCents: 123400,
    message: 'Get yo money',
    initiatorUserId: admin.id
  };
  const payout = await create(data);

  t.deepEqual(
    omit(payout, 'createdAt', 'shortId'),
    data,
    'Returns the newly created resource'
  );

  const logsFromAccount = await findByPayoutAccountId(payoutAccount.id);
  t.deepEqual(logsFromAccount, [payout]);

  const logsFromUser = await findByUserId(user.id);
  t.deepEqual(logsFromUser, [
    {
      ...payout,
      collectionId: collection.id,
      collectionTitle: collection.title
    }
  ]);
});

test('empty case when searching logs', async (t: Test) => {
  const { user } = await createUser({ role: 'PARTNER', withSession: false });
  const logsFromUser = await findByUserId(user.id);
  t.deepEqual(logsFromUser, [], 'Returns an empty list');
});
