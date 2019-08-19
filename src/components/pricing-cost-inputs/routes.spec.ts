import { omit } from 'lodash';

import * as db from '../../services/db';
import { test, Test } from '../../test-helpers/fresh';
import { authHeader, get, post } from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../product-designs/dao';
import PricingCostInput from './domain-object';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import generateProductTypes from '../../services/generate-product-types';
import { Dollars } from '../../services/dollars';

test('POST /pricing-cost-inputs', async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await createDesign({
    productType: 'DRESS',
    title: 'A beautiful dress',
    userId: user.id
  });

  const input: Unsaved<PricingCostInput> = {
    designId: design.id,
    expiresAt: null,
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

  const [response, costInputs] = await post('/pricing-cost-inputs', {
    body: input,
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201);
  t.deepEqual(omit(costInputs, ['createdAt', 'id', 'deletedAt']), {
    ...input,
    expiresAt: null
  });
});

test('GET /pricing-cost-inputs?designId gets the original versions', async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await createDesign({
    productType: 'DRESS',
    title: 'A beautiful dress',
    userId: user.id
  });

  const input: Unsaved<PricingCostInput> = {
    designId: design.id,
    expiresAt: null,
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

  await post('/pricing-cost-inputs', {
    body: input,
    headers: authHeader(session.id)
  });

  const pricingProductTypeTee = generateProductTypes({
    contrast: [0.15, 0.5, 1, 0],
    typeMediumCents: Dollars(20),
    typeMediumDays: 5,
    typeName: 'TEESHIRT',
    typeYield: 1.5,
    version: 1
  });
  await db.insert(pricingProductTypeTee).into('pricing_product_types');

  const [response, costInputs] = await get(
    `/pricing-cost-inputs?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(
    omit(costInputs[0], ['createdAt', 'id', 'deletedAt', 'processes']),
    omit({ ...input, expiresAt: null }, 'processes')
  );
  t.deepEqual(costInputs[0].processes, input.processes);
});
