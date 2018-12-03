import * as uuid from 'node-uuid';

import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import * as ProductDesignsDAO from '../product-designs';
import * as PricingCostInputsDAO from './index';
import PricingCostInput from '../../domain-objects/pricing-cost-input';

test('PricingCostInputsDAO supports creation and retrieval', async (t: Test) => {
  const { user } = await createUser();
  const design = await ProductDesignsDAO.create({
    productType: 'DRESS',
    title: 'A design',
    userId: user.id
  });
  const input: PricingCostInput = {
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 12000,
    materialCategory: 'STANDARD',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: 'SMALL',
        name: 'EMBROIDERY'
      }
    ],
    productComplexity: 'MEDIUM',
    productType: 'DRESS'
  };

  const created = await PricingCostInputsDAO.create(input);

  t.deepEqual(created, input);

  const retrieved = await PricingCostInputsDAO.findById(input.id);

  t.deepEqual(retrieved, created);
});

test('PricingCostInputsDAO supports retrieval by designID', async (t: Test) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { user } = await createUser();
  const design = await ProductDesignsDAO.create({
    productType: 'DRESS',
    title: 'A design',
    userId: user.id
  });
  const input: PricingCostInput = {
    createdAt: yesterday,
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 12000,
    materialCategory: 'STANDARD',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: 'SMALL',
        name: 'EMBROIDERY'
      }
    ],
    productComplexity: 'MEDIUM',
    productType: 'DRESS'
  };
  const anotherInput: PricingCostInput = {
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 12500,
    materialCategory: 'SPECIFY',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: 'SMALL',
        name: 'EMBROIDERY'
      }
    ],
    productComplexity: 'MEDIUM',
    productType: 'DRESS'
  };
  await PricingCostInputsDAO.create(input);
  await PricingCostInputsDAO.create(anotherInput);
  const designInputs = await PricingCostInputsDAO.findByDesignId(design.id);

  t.deepEqual(designInputs, [anotherInput, input]);
});
