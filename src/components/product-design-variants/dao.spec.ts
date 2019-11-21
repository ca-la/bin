import uuid from 'node-uuid';

import { create as createDesign } from '../../components/product-designs/dao';
import createUser = require('../../test-helpers/create-user');
import { sandbox, test, Test } from '../../test-helpers/fresh';

import { dataAdapter } from './domain-object';
import {
  findByCollectionId,
  getSizes,
  getTotalUnitsToProduce,
  replaceForDesign,
  update
} from './dao';
import generateCollection from '../../test-helpers/factories/collection';
import { addDesign } from '../../test-helpers/collections';

async function createPrerequisites(): Promise<any> {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });
  const { collection } = await generateCollection();
  await addDesign(collection.id, design.id);

  const variants = await replaceForDesign(design.id, [
    {
      colorName: 'Green',
      designId: design.id,
      id: uuid.v4(),
      position: 0,
      sizeName: 'M',
      unitsToProduce: 123,
      universalProductCode: null
    },
    {
      colorName: 'Red',
      designId: design.id,
      id: uuid.v4(),
      position: 1,
      sizeName: 'L',
      unitsToProduce: 456,
      universalProductCode: null
    },
    {
      colorName: 'Red',
      designId: design.id,
      id: uuid.v4(),
      position: 2,
      sizeName: 'M',
      unitsToProduce: 789,
      universalProductCode: null
    },
    {
      colorName: 'Red',
      designId: design.id,
      id: uuid.v4(),
      position: 3,
      sizeName: 'XL but not actually making any?',
      unitsToProduce: 0,
      universalProductCode: null
    }
  ]);

  return { user, design, variants, collection };
}

test('ProductDesignVariantsDAO.getTotalUnitsToProduce sums units', async (t: Test) => {
  const { design } = await createPrerequisites();

  const sum = await getTotalUnitsToProduce(design.id);
  t.equal(sum, 1368);
});

test('ProductDesignVariantsDAO.getSizes returns a list of sizes', async (t: Test) => {
  const { design } = await createPrerequisites();
  const sizes = await getSizes(design.id);
  t.deepEqual(sizes.sort(), ['L', 'M']);
});

test('ProductDesignVariantsDAO.findByCollectionId returns a list of variants', async (t: Test) => {
  const { collection, variants } = await createPrerequisites();
  const foundVariants = await findByCollectionId(collection.id);
  t.deepEqual(
    variants,
    foundVariants,
    'All variants are returned for collection'
  );
});

test('ProductDesignVariantsDAO.update updates a variant', async (t: Test) => {
  const { variants } = await createPrerequisites();
  const variant = variants[0];
  const updated = await update(variant.id, {
    ...variant,
    universalProductCode: '123456789012'
  });
  t.deepEqual(
    updated,
    {
      ...variant,
      universalProductCode: '123456789012'
    },
    'Variant is updated'
  );
});

test('replaceVariants does not delete old ones if creation fails', async (t: Test) => {
  const { design } = await createPrerequisites();
  sandbox()
    .stub(dataAdapter, 'forInsertion')
    .throws(new Error('A deep internal error'));

  await replaceForDesign(design.id, [
    {
      colorName: 'Black',
      designId: design.id,
      id: uuid.v4(),
      position: 0,
      sizeName: '5XL',
      unitsToProduce: 1,
      universalProductCode: null
    }
  ])
    .then(() => t.fail('replaceForDesign should not have succeeded'))
    .catch((err: Error) => {
      t.equal(err.message, 'A deep internal error');
    });

  const sizes = await getSizes(design.id);
  t.deepEqual(sizes.sort(), ['L', 'M']);
});

test('replaceVariants works for well formed variants', async (t: Test) => {
  const { design } = await createPrerequisites();

  const variants = await replaceForDesign(design.id, [
    {
      colorName: 'Gold',
      colorNamePosition: 9,
      designId: design.id,
      id: uuid.v4(),
      position: 20,
      sizeName: '5XL',
      unitsToProduce: 1,
      universalProductCode: null
    }
  ]);

  t.equal(variants.length, 1, 'Replaces all variants for the new one');
  t.equal(
    variants[0].colorNamePosition,
    9,
    'Saves the color position correctly'
  );
  t.equal(variants[0].position, 20, 'Saves the position correctly');
});