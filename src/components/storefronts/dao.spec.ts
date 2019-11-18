import * as Knex from 'knex';

import db from '../../services/db';
import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import * as StorefrontsDAO from './dao';

test('StorefrontsDAO can save and retrieve stores', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const created = await StorefrontsDAO.create(
      {
        createdBy: user.id,
        name: 'My Cool Store'
      },
      trx
    );
    const found = await StorefrontsDAO.findById(created.id, trx);

    t.deepEqual(created, found);
  });
});
