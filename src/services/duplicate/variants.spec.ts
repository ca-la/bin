import * as Knex from 'knex';
import * as tape from 'tape';
import * as uuid from 'node-uuid';

import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../../dao/product-designs';
import * as db from '../../services/db';
import { test } from '../../test-helpers/fresh';

import * as VariantsDAO from '../../dao/product-design-variants';
import Variant from '../../domain-objects/product-design-variant';

import { findAndDuplicateVariants } from './variants';

test('findAndDuplicateVariants for a design with no variants', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const duplicatedVariants = await db.transaction(async (trx: Knex.Transaction) => {
    return findAndDuplicateVariants(design.id, design.id, trx);
  });

  t.equal(duplicatedVariants.length, 0, 'no variants were duplicated.');
});

test('findAndDuplicateVariants for a design with variants', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });
  const newDesign = await createDesign({
    productType: 'TEESHIRT',
    title: 'Black Striped Oversize Tee',
    userId: user.id
  });
  const variantOne = await VariantsDAO.create({
    colorName: 'Green',
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: 'M',
    unitsToProduce: 123
  });
  const variantTwo = await VariantsDAO.create({
    colorName: 'Red',
    designId: design.id,
    id: uuid.v4(),
    position: 1,
    sizeName: 'L',
    unitsToProduce: 456
  });

  const duplicatedVariants = await db.transaction(async (trx: Knex.Transaction) => {
    return findAndDuplicateVariants(design.id, newDesign.id, trx);
  });

  const sortedDupes = duplicatedVariants.sort((a: Variant, b: Variant): number => {
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  t.equal(sortedDupes.length, 2, 'Should return two duplicate variants');
  const dupeOne = sortedDupes[0];
  t.deepEqual(
    dupeOne,
    {
      ...variantOne,
      createdAt: dupeOne.createdAt,
      designId: newDesign.id,
      id: dupeOne.id
    },
    'Returns a duplicate of the first variant pointing to the new design'
  );
  const dupeTwo = sortedDupes[1];
  t.deepEqual(
    dupeTwo,
    {
      ...variantTwo,
      createdAt: dupeTwo.createdAt,
      designId: newDesign.id,
      id: dupeTwo.id
    },
    'Returns a duplicate of the second variant pointing to the new design'
  );
});
