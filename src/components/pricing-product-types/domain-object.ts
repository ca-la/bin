import { Complexity, ProductType } from "../../domain-objects/pricing";
import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

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
  name: ProductType;
  patternMinimumCents: number;
  complexity: Complexity;
  unitCents: number;
  yield: number;
  contrast: number;
  createdAt: Date;
  creationTimeMs: number;
  specificationTimeMs: number;
  sourcingTimeMs: number;
  samplingTimeMs: number;
  preProductionTimeMs: number;
  productionTimeMs: number;
  fulfillmentTimeMs: number;
}

export interface PricingProductTypeRow {
  id: string;
  version: number;
  minimum_units: number;
  name: ProductType;
  pattern_minimum_cents: number;
  complexity: string;
  unit_cents: number;
  yield: number;
  contrast: number;
  created_at: string;
  creation_time_ms: string;
  specification_time_ms: string;
  sourcing_time_ms: string;
  sampling_time_ms: string;
  pre_production_time_ms: string;
  production_time_ms: string;
  fulfillment_time_ms: string;
}

const encode = (row: PricingProductTypeRow): PricingProductType => {
  return {
    complexity: row.complexity as Complexity,
    contrast: row.contrast,
    createdAt: new Date(row.created_at),
    creationTimeMs: parseInt(row.creation_time_ms, 10),
    fulfillmentTimeMs: parseInt(row.fulfillment_time_ms, 10),
    id: row.id,
    minimumUnits: row.minimum_units,
    name: row.name,
    patternMinimumCents: row.pattern_minimum_cents,
    preProductionTimeMs: parseInt(row.pre_production_time_ms, 10),
    productionTimeMs: parseInt(row.production_time_ms, 10),
    samplingTimeMs: parseInt(row.sampling_time_ms, 10),
    sourcingTimeMs: parseInt(row.sourcing_time_ms, 10),
    specificationTimeMs: parseInt(row.specification_time_ms, 10),
    unitCents: row.unit_cents,
    version: row.version,
    yield: row.yield,
  };
};

const decode = (data: PricingProductType): PricingProductTypeRow => {
  return {
    complexity: data.complexity,
    contrast: data.contrast,
    created_at: data.createdAt.toISOString(),
    creation_time_ms: data.creationTimeMs.toString(),
    fulfillment_time_ms: data.fulfillmentTimeMs.toString(),
    id: data.id,
    minimum_units: data.minimumUnits,
    name: data.name,
    pattern_minimum_cents: data.patternMinimumCents,
    pre_production_time_ms: data.preProductionTimeMs.toString(),
    production_time_ms: data.productionTimeMs.toString(),
    sampling_time_ms: data.samplingTimeMs.toString(),
    sourcing_time_ms: data.sourcingTimeMs.toString(),
    specification_time_ms: data.specificationTimeMs.toString(),
    unit_cents: data.unitCents,
    version: data.version,
    yield: data.yield,
  };
};

export const dataAdapter = new DataAdapter<
  PricingProductTypeRow,
  PricingProductType
>(encode, decode);

export function isPricingProductTypeRow(
  row: object
): row is PricingProductTypeRow {
  return hasProperties(
    row,
    "id",
    "version",
    "minimum_units",
    "name",
    "pattern_minimum_cents",
    "complexity",
    "unit_cents",
    "yield",
    "contrast",
    "created_at",
    "creation_time_ms",
    "specification_time_ms",
    "sourcing_time_ms",
    "sampling_time_ms",
    "pre_production_time_ms",
    "production_time_ms",
    "fulfillment_time_ms"
  );
}
