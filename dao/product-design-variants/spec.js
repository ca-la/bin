'use strict';

const { getTotalUnitsToProduce, getSizes, replaceForDesign } = require('./index');

const createDesign = require('../product-designs').create;
const createUser = require('../../test-helpers/create-user');
const { test } = require('../../test-helpers/fresh');

async function createPrerequisites() {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });

  const variants = await replaceForDesign(design.id, [
    {
      unitsToProduce: 123,
      sizeName: 'M',
      colorName: 'Green',
      position: 0
    },
    {
      unitsToProduce: 456,
      sizeName: 'L',
      colorName: 'Red',
      position: 1
    },
    {
      unitsToProduce: 789,
      sizeName: 'M',
      colorName: 'Red',
      position: 2
    },
    {
      unitsToProduce: 0,
      sizeName: 'XL but not actually making any?',
      colorName: 'Red',
      position: 3
    }
  ]);

  return { user, design, variants };
}

test('ProductDesignVariantsDAO.getTotalUnitsToProduce sums units', async (t) => {
  const { design } = await createPrerequisites();

  const sum = await getTotalUnitsToProduce(design.id);
  t.equal(sum, 1368);
});

test('ProductDesignVariantsDAO.getSizes returns a list of sizes', async (t) => {
  const { design } = await createPrerequisites();

  const sizes = await getSizes(design.id);
  t.deepEqual(sizes.sort(), ['L', 'M']);
});
