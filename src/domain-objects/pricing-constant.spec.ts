import * as Tape from 'tape';
import { test } from '../test-helpers/fresh';

import PricingConstant, {
  dataAdapter,
  isPricingConstantRow,
  PricingConstantRow
} from './pricing-constant';

const now = new Date();
const validRowData: PricingConstantRow = {
  branded_labels_additional_cents: 0,
  branded_labels_minimum_cents: 0,
  branded_labels_minimum_units: 0,
  created_at: now,
  grading_cents: 0,
  id: 'string',
  marking_cents: 0,
  pattern_revision_cents: 0,
  sample_minimum_cents: 0,
  technical_design_cents: 0,
  working_session_cents: 0
};
const invalidRowData = {
  created_at: now,
  grading_cents: 0,
  marking_cents: 0,
  sample_minimum_cents: 0,
  technical_design_cents: 0,
  working_session_cents: 0
};
const equivalentUserData: PricingConstant = {
  brandedLabelsAdditionalCents: 0,
  brandedLabelsMinimumCents: 0,
  brandedLabelsMinimumUnits: 0,
  createdAt: now,
  gradingCents: 0,
  id: 'string',
  markingCents: 0,
  patternRevisionCents: 0,
  sampleMinimumCents: 0,
  technicalDesignCents: 0,
  workingSessionCents: 0
};

test('PricingConstant', async (t: Tape.Test): Promise<void> => {
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
    isPricingConstantRow(invalidRowData),
    'type guard rejects invalid data'
  );
  t.ok(
    isPricingConstantRow(validRowData),
    'type guard passes with valid data'
  );
});
