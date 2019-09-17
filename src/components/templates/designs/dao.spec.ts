import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import { test, Test } from '../../../test-helpers/fresh';
import createDesign from '../../../services/create-design';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import { create } from './dao';

test('create()', async (t: Test) => {
  const { user } = await createUser({ role: 'ADMIN', withSession: false });
  const design = await createDesign({
    productType: 'SHIRT',
    title: 'Test Shirt',
    userId: user.id
  });

  // Cannot mark an unknown design as a template
  await db.transaction(async (trx: Knex.Transaction) => {
    const fakeDesign = uuid.v4();
    try {
      await create({ designId: fakeDesign }, trx);
      t.fail('Should not successfully create a template.');
    } catch (error) {
      t.equal(error.message, `Design ${fakeDesign} does not exist.`);
    }
  });

  // Can mark a design as a template.
  await db.transaction(async (trx: Knex.Transaction) => {
    const result = await create({ designId: design.id }, trx);
    t.deepEqual(result, { designId: design.id });
  });

  // Cannot mark a design as a template multiple times.
  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await create({ designId: design.id }, trx);
      t.fail('Should not successfully create a template.');
    } catch (error) {
      t.equal(error.message, `Design ${design.id} is already a template.`);
    }
  });
});
