import * as uuid from 'node-uuid';

import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import * as ProductDesignsDAO from '../product-designs';
import * as PricingCostInputsDAO from './index';
import PricingCostInput from '../../domain-objects/pricing-cost-input';
import { omit } from 'lodash';
import generatePricingValues from '../../test-helpers/factories/pricing-values';

test('PricingCostInputsDAO supports creation and retrieval', async (t: Test) => {
  await generatePricingValues();
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
    productType: 'DRESS',
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0
  };

  const created = await PricingCostInputsDAO.create(input);

  t.deepEqual(omit(created, 'processes'), omit(input, 'processes'));
  t.deepEqual(created.processes.sort(), input.processes.sort());

  const retrieved = await PricingCostInputsDAO.findById(input.id);

  t.deepEqual(retrieved, created);
});

test('PricingCostInputsDAO supports retrieval by designID', async (t: Test) => {
  await generatePricingValues();
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
    productType: 'DRESS',
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0
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
    productType: 'DRESS',
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0
  };
  await PricingCostInputsDAO.create(input);
  await PricingCostInputsDAO.create(anotherInput);
  const designInputs = await PricingCostInputsDAO.findByDesignId(design.id);

  t.deepEqual(designInputs, [anotherInput, input]);
});
