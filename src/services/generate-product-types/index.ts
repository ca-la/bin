import * as uuid from 'node-uuid';
import { Cents, Dollars } from '../../services/dollars';
import { PricingProductTypeRow } from '../../components/pricing-product-types/domain-object';
import { daysToMs } from '../time-conversion';

// [units, priceMultiplier, timeMultiplier]
const currentUnitsAndMultiplier: [number, number, number][] = [
  [1, 10, 0.1],
  [5, 1.52, 0.25],
  [15, 1.48, 0.25],
  [25, 1.46, 0.6],
  [50, 1.43, 0.7],
  [75, 1.38, 0.7],
  [100, 1.34, 0.8],
  [150, 1.26, 0.85],
  [200, 1.18, 0.9],
  [250, 1.11, 0.95],
  [300, 1, 1],
  [500, 0.75, 1.1],
  [750, 0.5, 1.25],
  [1250, 0.5, 1.8],
  [1500, 0.25, 1.8],
  [2000, 0.25, 1.9]
];

const baseCreationDays = 0;
const baseSpecificationDays = 3;
const baseSourcingDays = 3;
const baseSamplingDays = 3;
const basePreProductionDays = 3;
const baseFulfillmentDays = 3;

const timeComplexityMultiple = {
  blank: 0.3,
  complex: 1.25,
  medium: 1,
  simple: 0.5
};

interface ProductTypeGeneratorArgs {
  typeName: string;
  typeMediumCents: Cents;
  typeMediumDays: number;
  typeYield: number;
  contrast: [number, number, number, number];
  version: number;
}

export default function generateProductTypes(
  args: ProductTypeGeneratorArgs
): Uninserted<PricingProductTypeRow>[] {
  const {
    typeMediumCents,
    typeMediumDays,
    typeName,
    typeYield,
    contrast,
    version
  } = args;
  return currentUnitsAndMultiplier.reduce(
    (
      acc: Uninserted<PricingProductTypeRow>[],
      [units, unitMultiplier, timeMultiplier]: [number, number, number]
    ): Uninserted<PricingProductTypeRow>[] =>
      acc.concat([
        {
          complexity: 'SIMPLE',
          contrast: contrast[0],
          creation_time_ms: daysToMs(baseCreationDays).toString(),
          fulfillment_time_ms: daysToMs(baseFulfillmentDays).toString(),
          id: uuid.v4(),
          minimum_units: units,
          name: typeName,
          pattern_minimum_cents: Dollars(100),
          pre_production_time_ms: (
            daysToMs(basePreProductionDays) * timeComplexityMultiple.simple
          ).toString(),
          production_time_ms: daysToMs(
            typeMediumDays * timeComplexityMultiple.simple * timeMultiplier
          ).toString(),
          sampling_time_ms: (
            daysToMs(baseSamplingDays) * timeComplexityMultiple.simple
          ).toString(),
          sourcing_time_ms: (
            daysToMs(baseSourcingDays) * timeComplexityMultiple.simple
          ).toString(),
          specification_time_ms: (
            daysToMs(baseSpecificationDays) * timeComplexityMultiple.simple
          ).toString(),
          unit_cents: Math.ceil(typeMediumCents * 0.75 * unitMultiplier),
          version,
          yield: typeYield
        },
        {
          complexity: 'MEDIUM',
          contrast: contrast[1],
          creation_time_ms: daysToMs(baseCreationDays).toString(),
          fulfillment_time_ms: daysToMs(baseFulfillmentDays).toString(),
          id: uuid.v4(),
          minimum_units: units,
          name: typeName,
          pattern_minimum_cents: Dollars(250),
          pre_production_time_ms: (
            daysToMs(basePreProductionDays) * timeComplexityMultiple.medium
          ).toString(),
          production_time_ms: daysToMs(
            typeMediumDays * timeComplexityMultiple.medium * timeMultiplier
          ).toString(),
          sampling_time_ms: (
            daysToMs(baseSamplingDays) * timeComplexityMultiple.medium
          ).toString(),
          sourcing_time_ms: (
            daysToMs(baseSourcingDays) * timeComplexityMultiple.medium
          ).toString(),
          specification_time_ms: (
            daysToMs(baseSpecificationDays) * timeComplexityMultiple.medium
          ).toString(),
          unit_cents: Math.ceil(typeMediumCents * 1 * unitMultiplier),
          version,
          yield: typeYield
        },
        {
          complexity: 'COMPLEX',
          contrast: contrast[2],
          creation_time_ms: daysToMs(baseCreationDays).toString(),
          fulfillment_time_ms: daysToMs(baseFulfillmentDays).toString(),
          id: uuid.v4(),
          minimum_units: units,
          name: typeName,
          pattern_minimum_cents: Dollars(400),
          pre_production_time_ms: (
            daysToMs(basePreProductionDays) * timeComplexityMultiple.complex
          ).toString(),
          production_time_ms: daysToMs(
            typeMediumDays * timeComplexityMultiple.complex * timeMultiplier
          ).toString(),
          sampling_time_ms: (
            daysToMs(baseSamplingDays) * timeComplexityMultiple.complex
          ).toString(),
          sourcing_time_ms: (
            daysToMs(baseSpecificationDays) * timeComplexityMultiple.complex
          ).toString(),
          specification_time_ms: (
            daysToMs(baseSpecificationDays) * timeComplexityMultiple.complex
          ).toString(),
          unit_cents: Math.ceil(typeMediumCents * 1.75 * unitMultiplier),
          version,
          yield: typeYield
        },
        {
          complexity: 'BLANK',
          contrast: contrast[3],
          creation_time_ms: daysToMs(baseCreationDays).toString(),
          fulfillment_time_ms: daysToMs(baseSpecificationDays).toString(),
          id: uuid.v4(),
          minimum_units: units,
          name: typeName,
          pattern_minimum_cents: 0,
          pre_production_time_ms: (
            daysToMs(baseSpecificationDays) * timeComplexityMultiple.blank
          ).toString(),
          production_time_ms: daysToMs(
            typeMediumDays * timeComplexityMultiple.blank * timeMultiplier
          ).toString(),
          sampling_time_ms: '0',
          sourcing_time_ms: '0',
          specification_time_ms: (
            daysToMs(baseSpecificationDays) * timeComplexityMultiple.blank
          ).toString(),
          unit_cents: 0,
          version,
          yield: typeYield
        }
      ]),
    []
  );
}
