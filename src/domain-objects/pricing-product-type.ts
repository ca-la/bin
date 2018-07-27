import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} PricingProductType The cost by type of product and
 * complexity
 *
 * @property {string} id Primary ID
 * @property {number} version Version number for this set of margins
 * @property {number} minimumUnits Minimum number of units in this range
 * @property {string} name Name of the process
 * @property {number} patternMinimumCents Minimum cost for pattern
 * @property {string} complexity Product complexity
 * @property {number} unitCents Cost per unit
 * @property {number} yield How much material does this product type use?
 * @property {number} contrast Multiplier to account for anything other than the
 *   base fabric based on product complexity
 * @property {Date} createdAt Date when this record was created
 */
export default interface PricingProductType {
  id: string;
  version: number;
  minimumUnits: number;
  name: string;
  patternMinimumCents: number;
  complexity: string;
  unitCents: number;
  yield: number;
  contrast: number;
  createdAt: Date;
}

export interface PricingProductTypeRow {
  id: string;
  version: number;
  minimum_units: number;
  name: string;
  pattern_minimum_cents: number;
  complexity: string;
  unit_cents: number;
  yield: number;
  contrast: number;
  created_at: Date;
}

export const dataAdapter = new DataAdapter<PricingProductTypeRow, PricingProductType>();

export function isPricingProductTypeRow(row: object): row is PricingProductTypeRow {
  return hasProperties(
    row,
    'id',
    'version',
    'minimum_units',
    'name',
    'pattern_minimum_cents',
    'complexity',
    'unit_cents',
    'yield',
    'contrast',
    'created_at'
  );
}
