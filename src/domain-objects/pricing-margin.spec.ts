import * as Tape from 'tape';
import { test } from '../test-helpers/fresh';

import PricingMargin, {
  dataAdapter,
  isPricingMarginRow,
  PricingMarginRow
} from './pricing-margin';

const now = new Date();
const validRowData: PricingMarginRow = {
  created_at: now,
  id: 'string',
  margin: 0,
  minimum_units: 0,
  version: 0
};
const invalidRowData = {
  created_at: now,
  id: 'string',
  minimum_units: 0,
  version: 0
};
const equivalentUserData: PricingMargin = {
  createdAt: now,
  id: 'string',
  margin: 0,
  minimumUnits: 0,
  version: 0
};

test('PricingMargin', async (t: Tape.Test): Promise<void> => {
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
    isPricingMarginRow(invalidRowData),
    'type guard rejects invalid data'
  );
  t.ok(
    isPricingMarginRow(validRowData),
    'type guard passes with valid data'
  );
});
