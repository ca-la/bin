import uuid from 'node-uuid';

import * as PlansDAO from './dao';
import { get } from '../../test-helpers/http';
import { Plan } from './domain-object';
import { test, Test } from '../../test-helpers/fresh';

test('GET /plans lists available plans', async (t: Test) => {
  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 1234,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_123',
    title: 'A little Bit',
    isDefault: false
  });

  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 4567,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_456',
    title: 'Some More',
    isDefault: true
  });

  const [response, body] = await get('/plans');

  t.equal(response.status, 200);

  t.equal(body.length, 2);
  const sorted = body.sort(
    (a: Plan, b: Plan) => a.monthlyCostCents - b.monthlyCostCents
  );
  t.equal(sorted[0].title, 'A little Bit');
  t.equal(sorted[0].monthlyCostCents, 1234);
  t.equal(sorted[1].title, 'Some More');
  t.equal(sorted[1].monthlyCostCents, 4567);
});

test('GET /plans/:id returns a plan', async (t: Test) => {
  const plan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 1234,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_123',
    title: 'A little Bit',
    isDefault: false
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
    isDefault: false
  });

  const [response, body] = await get(
    '/plans/00000000-0000-0000-0000-000000000000'
  );

  t.equal(response.status, 404);
  t.equal(body.message, 'Plan not found');
});
