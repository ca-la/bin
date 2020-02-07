import Knex from 'knex';
import * as uuid from 'node-uuid';

import db from '../../services/db';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import createUser from '../../test-helpers/create-user';
import { generateDesign } from '../../test-helpers/factories/product-design';
import * as NonBidDesignCostsDAO from './dao';
import { Category } from './domain-object';

test('NonBidDesignCostsDAO.create', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({
    userId: user.id
  });

  const created = await db.transaction((trx: Knex.Transaction) =>
    NonBidDesignCostsDAO.create(trx, {
      createdBy: user.id,
      cents: 10000,
      category: Category.OTHER,
      note: 'A note',
      designId: design.id
    })
  );

  t.equal(created.createdBy, user.id);
  t.equal(created.cents, 10000);
  t.equal(created.category, Category.OTHER);
  t.equal(created.note, 'A note');
  t.equal(created.designId, design.id);
  t.ok(created.id);
  t.true(created.createdAt instanceof Date);
  t.equal(created.deletedAt, null);
});

test('NonBidDesignCostsDAO.findByDesign', async (t: Test) => {
  const clock = sandbox().useFakeTimers();
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({
    userId: user.id
  });
  const anotherDesign = await generateDesign({
    userId: user.id
  });

  return db.transaction(async (trx: Knex.Transaction) => {
    const zero = await NonBidDesignCostsDAO.create(trx, {
      createdBy: user.id,
      cents: 10000,
      category: Category.OTHER,
      note: 'A note',
      designId: design.id
    });

    clock.tick(1);

    const one = await NonBidDesignCostsDAO.create(trx, {
      createdBy: user.id,
      cents: 30000,
      category: Category.BLANKS,
      note: 'So blank',
      designId: design.id
    });

    clock.tick(1);

    const two = await NonBidDesignCostsDAO.create(trx, {
      createdBy: user.id,
      cents: 3000,
      category: Category.CUSTOM_PACKAGING,
      note: 'Glitter',
      designId: anotherDesign.id
    });

    const byDesign = await NonBidDesignCostsDAO.findByDesign(trx, design.id);
    const byAnotherDesign = await NonBidDesignCostsDAO.findByDesign(
      trx,
      anotherDesign.id
    );

    t.deepEqual(byDesign, [zero, one], 'finds the costs by design');
    t.deepEqual(byAnotherDesign, [two], 'finds the costs by design');

    await NonBidDesignCostsDAO.deleteById(trx, one.id);

    t.deepEqual(
      await NonBidDesignCostsDAO.findByDesign(trx, design.id),
      [zero],
      'does not return deleted costs'
    );
  });
});

test('NonBidDesignCostsDAO.deleteById', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({
    userId: user.id
  });

  return db.transaction(async (trx: Knex.Transaction) => {
    const created = await NonBidDesignCostsDAO.create(trx, {
      createdBy: user.id,
      cents: 10000,
      category: Category.OTHER,
      note: 'A note',
      designId: design.id
    });

    try {
      await NonBidDesignCostsDAO.deleteById(trx, created.id);
      t.pass('allows deleting costs that were created');
    } catch {
      t.fail('should not reject');
    }

    try {
      await NonBidDesignCostsDAO.deleteById(trx, created.id);
      t.fail('should not succeed');
    } catch {
      t.pass(
        'rejects when trying to delete something that has already been deleted'
      );
    }

    try {
      await NonBidDesignCostsDAO.deleteById(trx, uuid.v4());
      t.fail('should not succeed');
    } catch {
      t.pass('rejects when trying to delete something that does not exist');
    }
  });
});
