import * as uuid from 'node-uuid';

import { create as createDesign } from '../product-designs';
import createUser = require('../../test-helpers/create-user');
import { test, Test } from '../../test-helpers/fresh';

import { getSizes, getTotalUnitsToProduce, replaceForDesign } from './index';

async function createPrerequisites(): Promise<any> {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const variants = await replaceForDesign(design.id, [
    {
      colorName: 'Green',
      designId: design.id,
      id: uuid.v4(),
      position: 0,
      sizeName: 'M',
      unitsToProduce: 123
    },
    {
      colorName: 'Red',
      designId: design.id,
      id: uuid.v4(),
      position: 1,
      sizeName: 'L',
      unitsToProduce: 456
    },
    {
      colorName: 'Red',
      designId: design.id,
      id: uuid.v4(),
      position: 2,
      sizeName: 'M',
      unitsToProduce: 789
    },
    {
      colorName: 'Red',
      designId: design.id,
      id: uuid.v4(),
      position: 3,
      sizeName: 'XL but not actually making any?',
      unitsToProduce: 0
    }
  ]);

  return { user, design, variants };
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
