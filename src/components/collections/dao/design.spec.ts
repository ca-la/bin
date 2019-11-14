import uuid from 'node-uuid';
import Knex from 'knex';

import { test, Test } from '../../../test-helpers/fresh';
import { addDesigns, moveDesigns, removeDesigns } from './design';
import createUser = require('../../../test-helpers/create-user');
import generateCollection from '../../../test-helpers/factories/collection';
import { generateDesign } from '../../../test-helpers/factories/product-design';
import { findByCollectionId } from '../../product-designs/dao';
import db from '../../../services/db';
import ProductDesign = require('../../product-designs/domain-objects/product-design');

test('addDesign, moveDesigns, and removeDesigns', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const { collection: c2 } = await generateCollection();
  const { collection: c3 } = await generateCollection();
  const d1 = await generateDesign({
    createdAt: new Date('2019-04-20'),
    userId: user.id
  });
  const d2 = await generateDesign({
    createdAt: new Date('2019-04-21'),
    userId: user.id
  });
  const d3 = await generateDesign({
    createdAt: new Date('2019-04-22'),
    userId: user.id
  });

  // adding designs to collections
  await db.transaction(async (trx: Knex.Transaction) => {
    const insertionCount = await addDesigns({
      collectionId: c1.id,
      designIds: [d1.id, d2.id],
      trx
    });
    t.equal(insertionCount, 2);

    const insertionCount2 = await addDesigns({
      collectionId: c2.id,
      designIds: [d3.id],
      trx
    });
    t.equal(insertionCount2, 1);
  });

  const designs = await findByCollectionId(c1.id);
  t.deepEqual(designs.map((design: ProductDesign) => design.id), [
    d2.id,
    d1.id
  ]);

  const designs2 = await findByCollectionId(c2.id);
  t.deepEqual(designs2.map((design: ProductDesign) => design.id), [d3.id]);

  const designs3 = await findByCollectionId(c3.id);
  t.deepEqual(designs3, []);

  // moving designs to collections
  await db.transaction(async (trx: Knex.Transaction) => {
    const insertionCount = await moveDesigns({
      collectionId: c3.id,
      designIds: [d1.id, d3.id],
      trx
    });
    t.equal(insertionCount, 2);
  });

  const movedDesigns = await findByCollectionId(c1.id);
  t.deepEqual(movedDesigns.map((design: ProductDesign) => design.id), [d2.id]);

  const movedDesigns2 = await findByCollectionId(c2.id);
  t.deepEqual(movedDesigns2, []);

  const movedDesigns3 = await findByCollectionId(c3.id);
  t.deepEqual(movedDesigns3.map((design: ProductDesign) => design.id), [
    d3.id,
    d1.id
  ]);

  // removing designs from a collection
  await db.transaction(async (trx: Knex.Transaction) => {
    const removedCount = await removeDesigns({
      collectionId: c3.id,
      designIds: [d1.id, d3.id],
      trx
    });

    t.equal(removedCount, 2);
  });

  const removedDesigns = await findByCollectionId(c1.id);
  t.deepEqual(removedDesigns.map((design: ProductDesign) => design.id), [
    d2.id
  ]);

  const removedDesigns2 = await findByCollectionId(c2.id);
  t.deepEqual(removedDesigns2, []);

  const removedDesigns3 = await findByCollectionId(c3.id);
  t.deepEqual(removedDesigns3, []);
});

test('failure cases', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({
    createdBy: user.id
  });
  const d1 = await generateDesign({
    createdAt: new Date('2019-04-20'),
    userId: user.id
  });
  const d2 = await generateDesign({
    createdAt: new Date('2019-04-21'),
    userId: user.id
  });
  const d3 = await generateDesign({
    createdAt: new Date('2019-04-22'),
    userId: user.id
  });

  // should not be able to add designs to a non-existent collection
  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await addDesigns({
        collectionId: uuid.v4(),
        designIds: [d1.id, d2.id, d3.id],
        trx
      });
      t.fail('Should not reach here.');
    } catch (error) {
      t.true(error.message.includes('violates foreign key constraint'));
    }
  });

  // should not be able to remove designs that were not in that collection.
  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await removeDesigns({
        collectionId: c1.id,
        designIds: [d1.id, d2.id],
        trx
      });
      t.fail('Should not reach here.');
    } catch (error) {
      t.true(error.message.includes('Failed to remove the following designs'));
    }
  });
});
