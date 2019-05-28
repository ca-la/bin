import { omit } from 'lodash';

import { test, Test } from '../../test-helpers/fresh';
import { authHeader, get, post } from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../../dao/product-designs';
import PricingCostInput from '../../domain-objects/pricing-cost-input';

test('POST /pricing-cost-inputs', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await createDesign({
    productType: 'DRESS',
    title: 'A beautiful dress',
    userId: user.id
  });

  const input: Unsaved<PricingCostInput> = {
    designId: design.id,
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

  const [response, costInputs] = await post('/pricing-cost-inputs', {
    body: input,
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201);
  t.deepEqual(omit(costInputs, ['createdAt', 'id', 'deletedAt']), input);
});

test('GET /pricing-cost-inputs?designId', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await createDesign({
    productType: 'DRESS',
    title: 'A beautiful dress',
    userId: user.id
  });

  const input: Unsaved<PricingCostInput> = {
    designId: design.id,
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

  await post('/pricing-cost-inputs', {
    body: input,
    headers: authHeader(session.id)
  });
  const [response, costInputs] = await get(
    `/pricing-cost-inputs?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(
    omit(costInputs[0], ['createdAt', 'id', 'deletedAt', 'processes']),
    omit(input, 'processes')
  );
  t.deepEqual(costInputs[0].processes, input.processes);
});
