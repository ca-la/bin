import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} PricingProcess The processing cost by complexity
 *
 * @property {string} id Primary ID
 * @property {number} version Version number for this set of margins
 * @property {string} name Name of the process
 * @property {number} minimumUnits Minimum number of units in this range
 * @property {string} complexity Complexity level
 * @property {number} setupCents Cost of setup charges
 * @property {number} unitCents Cost per unit
 * @property {Date} createdAt Date when this record was created
 */
export default interface PricingProcess {
  id: string;
  version: number;
  name: string;
  minimumUnits: number;
  complexity: string;
  setupCents: number;
  unitCents: number;
  createdAt: Date;
}

export interface PricingProcessRow {
  id: string;
  version: number;
  name: string;
  minimum_units: number;
  complexity: string;
  setup_cents: number;
  unit_cents: number;
  created_at: Date | string;
}

export const dataAdapter = new DataAdapter<PricingProcessRow, PricingProcess>();

export function isPricingProcessRow(row: object): row is PricingProcessRow {
  return hasProperties(
    row,
    'id',
    'version',
    'name',
    'minimum_units',
    'complexity',
    'setup_cents',
    'unit_cents',
    'created_at'
  );
}
