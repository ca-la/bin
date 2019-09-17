import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import { test, Test } from '../../../test-helpers/fresh';
import createDesign from '../../../services/create-design';
import createUser = require('../../../test-helpers/create-user');
import * as db from '../../../services/db';
import { create, getAll, remove } from './dao';

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

test('remove()', async (t: Test) => {
  const { user } = await createUser({ role: 'ADMIN', withSession: false });
  const design = await createDesign({
    productType: 'SHIRT',
    title: 'Test Shirt',
    userId: user.id
  });

  // create a template
  await db.transaction(async (trx: Knex.Transaction) => {
    await create({ designId: design.id }, trx);
    const results = await getAll(trx);
    t.deepEqual(
      results,
      [{ designId: design.id }],
      'There is only one element in the list.'
    );
  });

  // deleting something that isn't there
  const nonexistent = uuid.v4();
  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await remove(nonexistent, trx);
      t.fail('Should not reach here.');
    } catch (error) {
      t.equal(error.message, `Template for design ${nonexistent} not found.`);
    }
  });

  // can remove a template.
  await db.transaction(async (trx: Knex.Transaction) => {
    await remove(design.id, trx);
    const results = await getAll(trx);
    t.deepEqual(results, [], 'There are no templates in the list.');
  });
});
