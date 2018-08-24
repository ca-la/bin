import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} PricingProductMaterial The material cost by category
 *
 * @property {string} id Primary ID
 * @property {number} version Version number for this set of margins
 * @property {number} minimumUnits Minimum number of units in this range
 * @property {string} category Material quality category
 * @property {number} unitCents Cost per unit
 * @property {Date} createdAt Date when this record was created
 */
export default interface PricingProductMaterial {
  id: string;
  version: number;
  minimumUnits: number;
  category: string;
  unitCents: number;
  createdAt: Date;
}

export interface PricingProductMaterialRow {
  id: string;
  version: number;
  minimum_units: number;
  category: string;
  unit_cents: number;
  created_at: Date;
}

export const dataAdapter = new DataAdapter<PricingProductMaterialRow, PricingProductMaterial>();

export function isPricingProductMaterialRow(row: object): row is PricingProductMaterialRow {
  return hasProperties(
    row,
    'id',
    'version',
    'minimum_units',
    'category',
    'unit_cents',
    'created_at'
  );
}