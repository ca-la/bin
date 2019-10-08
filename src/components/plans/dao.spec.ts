import * as uuid from 'node-uuid';

import * as PlansDAO from './dao';
import { Plan } from './domain-object';
import { test, Test } from '../../test-helpers/fresh';

test('PlansDAO supports creation and retrieval', async (t: Test) => {
  const p1id = uuid.v4();

  await PlansDAO.create({
    id: p1id,
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
    revenueSharePercentage: 50,
    stripePlanId: 'plan_456',
    title: 'Some More',
    isDefault: true
  });

  const p1Found = await PlansDAO.findById(p1id);
  t.equal(p1Found && p1Found.title, 'A little Bit', 'finds by ID');

  const plans = await PlansDAO.findAll();

  t.equal(plans.length, 2, 'finds all');
  const sorted = plans.sort(
    (a: Plan, b: Plan) => a.monthlyCostCents - b.monthlyCostCents
  );
  t.equal(sorted[0].title, 'A little Bit');
  t.equal(sorted[0].monthlyCostCents, 1234);
  t.equal(sorted[0].revenueSharePercentage, 12);
  t.equal(sorted[1].title, 'Some More');
  t.equal(sorted[1].monthlyCostCents, 4567);
  t.equal(sorted[1].revenueSharePercentage, 50);
});

test('PlansDAO.findById returns null if not found', async (t: Test) => {
  const plan = await PlansDAO.findById('00000000-0000-0000-0000-000000000000');
  t.equal(plan, null);
});

test('PlansDAO prevents creating multiple default plans', async (t: Test) => {
  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: 'MONTHLY',
    monthlyCostCents: 1234,
    revenueSharePercentage: 12,
    stripePlanId: 'plan_123',
    title: 'A little Bit',
    isDefault: true
  });

  try {
    await PlansDAO.create({
      id: uuid.v4(),
      billingInterval: 'MONTHLY',
      monthlyCostCents: 4567,
      revenueSharePercentage: 50,
      stripePlanId: 'plan_456',
      title: 'Some More',
      isDefault: true
    });
    throw new Error("Shouldn't get here");
  } catch (err) {
    t.equal(err.message, 'Only one default plan can exist');
  }
});
