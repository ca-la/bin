import * as Tape from 'tape';
import { test } from '../test-helpers/fresh';

import PricingProcess, {
  dataAdapter,
  isPricingProcessRow,
  PricingProcessRow
} from './pricing-process';

const now = new Date();
const validRowData: PricingProcessRow = {
  complexity: 'string',
  created_at: now,
  id: 'string',
  minimum_units: 0,
  name: 'string',
  setup_cents: 0,
  unit_cents: 0,
  version: 0
};
const invalidRowData = {
  complexity: 'string',
  created_at: now,
  setup_cents: 0,
  unit_cents: 0,
  version: 0
};
const equivalentUserData: PricingProcess = {
  complexity: 'string',
  createdAt: now,
  id: 'string',
  minimumUnits: 0,
  name: 'string',
  setupCents: 0,
  unitCents: 0,
  version: 0
};

test('PricingProcess', async (t: Tape.Test): Promise<void> => {
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
    isPricingProcessRow(invalidRowData),
    'type guard rejects invalid data'
  );
  t.ok(
    isPricingProcessRow(validRowData),
    'type guard passes with valid data'
  );
});
