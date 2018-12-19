import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} PricingConstant The constant values that are not calculated
 * and represent fixed costs for things that are included in the quote
 *
 * @property {string} id Primary ID
 * @property {number} workingSessionCents Cost of included working session
 * @property {number} technicalDesignCents Cost of included technical design
 * @property {number} patternRevisionCents Cost of included pattern revision
 * @property {number} gradingCents Cost of included grading
 * @property {number} markingCents Cost of included marking
 * @property {number} sampleMinimumCents Minimum cost of a sample (might be
 *   overridden based on design)
 * @property {Date} createdAt Date when this constant record was created
 */
export default interface PricingConstant {
  id: string;
  workingSessionCents: number;
  technicalDesignCents: number;
  patternRevisionCents: number;
  gradingCents: number;
  markingCents: number;
  sampleMinimumCents: number;
  brandedLabelsMinimumCents: number;
  brandedLabelsMinimumUnits: number;
  brandedLabelsAdditionalCents: number;
  createdAt: Date;
  version: number;
}

export interface PricingConstantRow {
  id: string;
  working_session_cents: number;
  technical_design_cents: number;
  pattern_revision_cents: number;
  grading_cents: number;
  marking_cents: number;
  sample_minimum_cents: number;
  branded_labels_minimum_cents: number;
  branded_labels_minimum_units: number;
  branded_labels_additional_cents: number;
  created_at: Date;
  version: number;
}

export const dataAdapter = new DataAdapter<PricingConstantRow, PricingConstant>();

export function isPricingConstantRow(row: object): row is PricingConstantRow {
  return hasProperties(
    row,
    'id',
    'working_session_cents',
    'technical_design_cents',
    'pattern_revision_cents',
    'grading_cents',
    'marking_cents',
    'sample_minimum_cents',
    'branded_labels_minimum_cents',
    'branded_labels_minimum_units',
    'branded_labels_additional_cents',
    'created_at'
  );
}
