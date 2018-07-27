import * as Tape from 'tape';
import { test } from '../test-helpers/fresh';

import PricingProductMaterial, {
  dataAdapter,
  isPricingProductMaterialRow,
  PricingProductMaterialRow
} from './pricing-product-material';

const now = new Date();
const validRowData: PricingProductMaterialRow = {
  category: 'string',
  created_at: now,
  id: 'string',
  minimum_units: 0,
  unit_cents: 0,
  version: 0
};
const invalidRowData = {
  category: 'string',
  created_at: now,
  version: 0
};
const equivalentUserData: PricingProductMaterial = {
  category: 'string',
  createdAt: now,
  id: 'string',
  minimumUnits: 0,
  unitCents: 0,
  version: 0
};

test('PricingProductMaterial', async (t: Tape.Test): Promise<void> => {
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
    isPricingProductMaterialRow(invalidRowData),
    'type guard rejects invalid data'
  );
  t.ok(
    isPricingProductMaterialRow(validRowData),
    'type guard passes with valid data'
  );
});
