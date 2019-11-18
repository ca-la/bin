import * as Knex from 'knex';

import db from '../../../services/db';
import { test, Test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import * as StorefrontsDAO from '../dao';
import * as StorefrontUsersDAO from './dao';

test('StorefrontUsersDAO can save and retrieve store users', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const storefront = await StorefrontsDAO.create(
      {
        createdBy: user.id,
        name: 'My Cool Store'
      },
      trx
    );
    const created = await StorefrontUsersDAO.create(
      {
        storefrontId: storefront.id,
        userId: user.id
      },
      trx
    );
    const found = await StorefrontUsersDAO.findByUserAndStorefront(
      user.id,
      storefront.id,
      trx
    );

    t.deepEqual(created, found);
  });
});
