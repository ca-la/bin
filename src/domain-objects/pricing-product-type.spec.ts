import { test, Test } from '../test-helpers/fresh';

import PricingProductType, {
  dataAdapter,
  isPricingProductTypeRow,
  PricingProductTypeRow
} from './pricing-product-type';

const now = new Date();
const validRowData: PricingProductTypeRow = {
  complexity: 'string',
  contrast: 0,
  created_at: now,
  id: 'string',
  minimum_units: 0,
  name: 'string',
  pattern_minimum_cents: 0,
  unit_cents: 0,
  version: 0,
  yield: 0
};
const invalidRowData = {
  complexity: 'string',
  unit_cents: 0,
  version: 0,
  yield: 0
};
const equivalentUserData: PricingProductType = {
  complexity: 'string',
  contrast: 0,
  createdAt: now,
  id: 'string',
  minimumUnits: 0,
  name: 'string',
  patternMinimumCents: 0,
  unitCents: 0,
  version: 0,
  yield: 0
};

test('PricingProductType', async (t: Test): Promise<void> => {
  t.deepEqual(
    validRowData,
    dataAdapter.toDb(equivalentUserData),
    'encode/decode produces an equivalent object'
  );
  t.deepEqual(
    equivalentUserData,
    dataAdapter.parse(validRowData),
    'has mapped values'
  );
  t.notOk(
    isPricingProductTypeRow(invalidRowData),
    'type guard rejects invalid data'
  );
  t.ok(
    isPricingProductTypeRow(validRowData),
    'type guard passes with valid data'
  );
});
