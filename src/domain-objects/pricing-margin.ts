import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} PricingMargin The margin-per-unit-range mapping
 *
 * @property {string} id Primary ID
 * @property {number} version Version number for this set of margins
 * @property {number} minimumUnits Minimum number of units in this range
 * @property {number} margin Margin in whole percents
 *   (15% is represented by the integer 15)
 * @property {Date} createdAt Date when this record was created
 */
export default interface PricingMargin {
  id: string;
  version: number;
  minimumUnits: number;
  margin: number;
  createdAt: Date;
}

export interface PricingMarginRow {
  id: string;
  version: number;
  minimum_units: number;
  margin: number;
  created_at: Date | string;
}

export const dataAdapter = new DataAdapter<PricingMarginRow, PricingMargin>();

export function isPricingMarginRow(row: object): row is PricingMarginRow {
  return hasProperties(
    row,
    'id',
    'version',
    'minimum_units',
    'margin',
    'created_at'
  );
}
