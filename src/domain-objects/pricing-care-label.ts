import DataAdapter from "../services/data-adapter";
import { hasProperties } from "../services/require-properties";

/**
 * @typedef {object} PricingCareLabel Care label costs
 *
 * @property {string} id Primary ID
 * @property {number} version Version number
 * @property {number} minimumUnits Minimum number of units in this range
 * @property {number} unitCents Cost per unit
 * @property {Date} createdAt Date when this record was created
 */
export default interface PricingCareLabel {
  id: string;
  version: number;
  minimumUnits: number;
  unitCents: number;
  createdAt: Date;
}

export interface PricingCareLabelRow {
  id: string;
  version: number;
  minimum_units: number;
  unit_cents: number;
  created_at: Date;
}

export const dataAdapter = new DataAdapter<
  PricingCareLabelRow,
  PricingCareLabel
>();

export function isPricingCareLabelRow(row: object): row is PricingCareLabelRow {
  return hasProperties(
    row,
    "id",
    "version",
    "minimum_units",
    "unit_cents",
    "created_at"
  );
}
