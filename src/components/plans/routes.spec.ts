import uuid from 'node-uuid';

import * as PlansDAO from './dao';
import { get } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';

test('GET /plans lists public plans in order', async (t: Test) => {
  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 1234,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_123',
    title: 'The Second One',
    isDefault: true,
    isPublic: true,
    description: 'The Second One',
    ordering: 2
  });

  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 4567,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_456',
    title: 'The Secret One',
    isDefault: false,
    isPublic: false,
    description: 'The Secret One',
    ordering: null
  });

  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 7890,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_789',
    title: 'The First One',
    isDefault: false,
    isPublic: true,
    description: 'The First One',
    ordering: 1
  });

  const [response, body] = await get('/plans');

  t.equal(response.status, 200);

  t.equal(body.length, 2);
  t.equal(body[0].title, 'The First One');
  t.equal(body[0].monthlyCostCents, 7890);

  t.equal(body[1].title, 'The Second One');
  t.equal(body[1].monthlyCostCents, 1234);
});

test('GET /plans/:id returns a plan', async (t: Test) => {
  const plan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 1234,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_123',
    title: 'A little Bit',
    isDefault: false,
    isPublic: false,
    description: null,
    ordering: null
  });

  const [response, body] = await get(`/plans/${plan.id}`);

  t.equal(response.status, 200);

  t.equal(body.title, 'A little Bit');
  t.equal(body.monthlyCostCents, 1234);
});

test('GET /plans/:id returns 404 when non-existent', async (t: Test) => {
  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 1234,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_123',
    title: 'A little Bit',
    isDefault: false,
    isPublic: true,
    ordering: 1,
    description: null
  });

  const [response, body] = await get(
    '/plans/00000000-0000-0000-0000-000000000000'
  );

  t.equal(response.status, 404);
  t.equal(body.message, 'Plan not found');
});
