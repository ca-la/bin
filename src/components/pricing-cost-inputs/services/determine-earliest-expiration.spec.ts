import { test, Test } from '../../../test-helpers/fresh';
import { determineEarliestExpiration } from './determine-earliest-expiration';
import generatePricingCostInput from '../../../test-helpers/factories/pricing-cost-input';
import generatePricingValues from '../../../test-helpers/factories/pricing-values';

test('determineEarliestExpiration works on an empty list', async (t: Test) => {
  const result = determineEarliestExpiration([]);
  t.equal(result, null);
});

test('determineEarliestExpiration works on a one element list', async (t: Test) => {
  await generatePricingValues();
  const { pricingCostInput: ci1 } = await generatePricingCostInput({
    expiresAt: null
  });

  const result = determineEarliestExpiration([ci1]);
  t.equal(result, null);
});

test('determineEarliestExpiration works on a list of expired cost inputs', async (t: Test) => {
  await generatePricingValues();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneWeekAgo.getDate() - 31);

  const { pricingCostInput: ci1 } = await generatePricingCostInput({
    expiresAt: yesterday
  });
  const { pricingCostInput: ci2 } = await generatePricingCostInput({
    expiresAt: oneWeekAgo
  });
  const { pricingCostInput: ci3 } = await generatePricingCostInput({
    expiresAt: oneMonthAgo
  });

  const result = determineEarliestExpiration([ci1, ci2, ci3]);
  t.equal(result, null);
});

test('determineEarliestExpiration works on a list with unexpired cost inputs', async (t: Test) => {
  await generatePricingValues();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { pricingCostInput: ci1 } = await generatePricingCostInput({
    expiresAt: null
  });
  const { pricingCostInput: ci2 } = await generatePricingCostInput({
    expiresAt: nextWeek
  });
  const { pricingCostInput: ci3 } = await generatePricingCostInput({
    expiresAt: tomorrow
  });

  const result = determineEarliestExpiration([ci1, ci2, ci3]);
  t.deepEqual(result, tomorrow);
});
