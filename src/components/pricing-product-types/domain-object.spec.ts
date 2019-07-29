import { test, Test } from '../../test-helpers/fresh';

import PricingProductType, {
  dataAdapter,
  isPricingProductTypeRow,
  PricingProductTypeRow
} from './domain-object';
import { daysToMs } from '../../services/time-conversion';

const now = new Date();
const validRowData: PricingProductTypeRow = {
  complexity: 'string',
  contrast: 0,
  created_at: now.toISOString(),
  creation_time_ms: daysToMs(0).toString(),
  fulfillment_time_ms: daysToMs(8).toString(),
  id: 'string',
  minimum_units: 0,
  name: 'string',
  pattern_minimum_cents: 0,
  pre_production_time_ms: daysToMs(7).toString(),
  production_time_ms: daysToMs(6).toString(),
  sampling_time_ms: daysToMs(5).toString(),
  sourcing_time_ms: daysToMs(4).toString(),
  specification_time_ms: daysToMs(3).toString(),
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
  creationTimeMs: daysToMs(0),
  fulfillmentTimeMs: daysToMs(8),
  id: 'string',
  minimumUnits: 0,
  name: 'string',
  patternMinimumCents: 0,
  preProductionTimeMs: daysToMs(7),
  productionTimeMs: daysToMs(6),
  samplingTimeMs: daysToMs(5),
  sourcingTimeMs: daysToMs(4),
  specificationTimeMs: daysToMs(3),
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
