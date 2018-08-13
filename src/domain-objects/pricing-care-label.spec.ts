import { test, Test } from '../test-helpers/fresh';

import PricingCareLabel, {
  dataAdapter,
  isPricingCareLabelRow,
  PricingCareLabelRow
} from './pricing-care-label';

const now = new Date();
const validRowData: PricingCareLabelRow = {
  created_at: now,
  id: 'string',
  minimum_units: 0,
  unit_cents: 0,
  version: 0
};
const invalidRowData = {
  created_at: now,
  unit_cents: 0,
  version: 0
};
const equivalentUserData: PricingCareLabel = {
  createdAt: now,
  id: 'string',
  minimumUnits: 0,
  unitCents: 0,
  version: 0
};

test('PricingCareLabel', async (t: Test): Promise<void> => {
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
    isPricingCareLabelRow(invalidRowData),
    'type guard rejects invalid data'
  );
  t.ok(
    isPricingCareLabelRow(validRowData),
    'type guard passes with valid data'
  );
});
