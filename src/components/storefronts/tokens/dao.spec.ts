import * as Knex from 'knex';

import db from '../../../services/db';
import { test, Test } from '../../../test-helpers/fresh';
import createUser from '../../../test-helpers/create-user';
import { ProviderName } from './domain-object';
import * as StorefrontsDAO from '../dao';
import * as StorefrontTokensDAO from './dao';

test('StorefrontTokensDAO can save and retrieve stores', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const storefront = await StorefrontsDAO.create(
      {
        createdBy: user.id,
        name: 'My Cool Store'
      },
      trx
    );
    const created = await StorefrontTokensDAO.create(
      {
        createdBy: user.id,
        providerName: ProviderName.SHOPIFY,
        storefrontId: storefront.id,
        token: 'a very secure string'
      },
      trx
    );
    const found = await StorefrontTokensDAO.findById(created.id, trx);

    t.deepEqual(created, found);
    t.true(found!.createdAt instanceof Date);
  });
});
