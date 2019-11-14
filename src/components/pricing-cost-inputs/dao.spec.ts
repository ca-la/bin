import uuid from 'node-uuid';
import Knex from 'knex';

import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import ProductDesignsDAO from '../product-designs/dao';
import * as PricingCostInputsDAO from './dao';
import PricingCostInput from './domain-object';
import { omit } from 'lodash';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import generatePricingCostInput from '../../test-helpers/factories/pricing-cost-input';
import db from './../../services/db';
import createDesign from '../../services/create-design';

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
    expiresAt: null,
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

  t.deepEqual(
    omit(created, 'processes'),
    omit({ ...input, expiresAt: null }, 'processes')
  );
  t.deepEqual(created.processes.sort(), input.processes.sort());

  const retrieved = await PricingCostInputsDAO.findById(input.id);

  t.deepEqual(retrieved, { ...created, expiresAt: null });
});

test('supports creation without processes', async (t: Test) => {
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
    expiresAt: null,
    id: uuid.v4(),
    materialBudgetCents: 12000,
    materialCategory: 'STANDARD',
    processes: [],
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

  t.deepEqual(created, { ...input, expiresAt: null, processes: [] });
});

test('findById does not return expired cost inputs', async (t: Test) => {
  await generatePricingValues();
  const { user: u1 } = await createUser({ withSession: false });
  const design1 = await createDesign({
    productType: 'PANTALOONES',
    title: 'I ripped my Pants',
    userId: u1.id
  });
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { pricingCostInput: ci1 } = await generatePricingCostInput({
    designId: design1.id,
    expiresAt: new Date('2019-04-20')
  });
  const { pricingCostInput: ci2 } = await generatePricingCostInput({
    designId: design1.id,
    expiresAt: nextWeek
  });

  const result = await PricingCostInputsDAO.findById(ci1.id);
  t.deepEqual(result, null);
  const result2 = await PricingCostInputsDAO.findById(ci2.id);
  t.deepEqual(result2, { ...ci2, processes: [] });
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
    expiresAt: null,
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
    expiresAt: null,
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
  const designInputs = await PricingCostInputsDAO.findByDesignId({
    designId: design.id
  });

  t.deepEqual(designInputs, [
    { ...anotherInput, expiresAt: null },
    { ...input, expiresAt: null }
  ]);
});

test('findByDesignId can filter expired cost inputs', async (t: Test) => {
  await generatePricingValues();
  const { user: u1 } = await createUser({ withSession: false });
  const design1 = await createDesign({
    productType: 'PANTALOONES',
    title: 'I ripped my Pants',
    userId: u1.id
  });
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { pricingCostInput: ci1 } = await generatePricingCostInput({
    designId: design1.id,
    expiresAt: new Date('2019-04-20')
  });
  const { pricingCostInput: ci2 } = await generatePricingCostInput({
    designId: design1.id,
    expiresAt: nextWeek
  });

  const result = await PricingCostInputsDAO.findByDesignId({
    designId: design1.id
  });
  t.deepEqual(result, [{ ...ci2, processes: [] }]);

  const result2 = await PricingCostInputsDAO.findByDesignId({
    designId: design1.id,
    showExpired: true
  });
  t.deepEqual(result2, [{ ...ci2, processes: [] }, { ...ci1, processes: [] }]);
});

test('expireCostInputs can expire rows with the associated designs', async (t: Test) => {
  await generatePricingValues();

  const {
    design: d1,
    pricingCostInput: ci1
  } = await generatePricingCostInput();
  const {
    design: d2,
    pricingCostInput: ci2
  } = await generatePricingCostInput();
  const date = new Date('2019-04-20');

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      t.deepEqual(ci1.expiresAt, null);
      t.deepEqual(ci2.expiresAt, null);

      const results = await PricingCostInputsDAO.expireCostInputs(
        [d1.id, d2.id],
        date,
        trx
      );

      const resultExpirations = results.map(
        (result: PricingCostInput): Date => {
          return new Date(result.expiresAt!);
        }
      );
      const resultIds = results.map(
        (result: PricingCostInput): string => {
          return result.id;
        }
      );

      t.deepEqual(resultIds.sort(), [ci1.id, ci2.id].sort());
      t.deepEqual(resultExpirations, [date, date]);
    }
  );
});

test('expireCostInputs does not expire rows that are already expired', async (t: Test) => {
  await generatePricingValues();

  const {
    design: d1,
    pricingCostInput: ci1
  } = await generatePricingCostInput();
  const {
    design: d2,
    pricingCostInput: ci2
  } = await generatePricingCostInput();
  const priorExpiration = new Date('2019-04-10');
  const { pricingCostInput: ci3 } = await generatePricingCostInput({
    designId: d2.id,
    expiresAt: priorExpiration
  });
  const date = new Date('2019-04-20');

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      t.deepEqual(ci1.expiresAt, null);
      t.deepEqual(ci2.expiresAt, null);
      t.deepEqual(new Date(ci3.expiresAt!), priorExpiration);

      const results = await PricingCostInputsDAO.expireCostInputs(
        [d1.id, d2.id],
        date,
        trx
      );

      const resultExpirations = results.map(
        (result: PricingCostInput): Date => {
          return new Date(result.expiresAt!);
        }
      );
      const resultIds = results.map(
        (result: PricingCostInput): string => {
          return result.id;
        }
      );

      t.deepEqual(resultIds.sort(), [ci1.id, ci2.id].sort());
      t.deepEqual(resultExpirations, [date, date]);
    }
  );
});
