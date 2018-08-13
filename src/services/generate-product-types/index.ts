import * as uuid from 'node-uuid';
import { Dollars } from '../../services/dollars';
import { PricingProductTypeRow } from '../../domain-objects/pricing-product-type';

const currentUnitsAndMultiplier: [number, number][] = [
  [1, 10],
  [5, 1.52],
  [15, 1.48],
  [25, 1.46],
  [50, 1.43],
  [75, 1.38],
  [100, 1.34],
  [150, 1.26],
  [200, 1.18],
  [250, 1.11],
  [300, 1],
  [500, 0.75],
  [750, 0.5],
  [1500, 0.25]
];
export default function generateProductTypes(
  typeName: string,
  typeMediumCents: Dollars,
  typeYield: number,
  contrast: [number, number, number],
  version: number
): Uninserted<PricingProductTypeRow>[] {
  return currentUnitsAndMultiplier.reduce(
    (
      acc: Uninserted<PricingProductTypeRow>[],
      [units, unitMultiplier]: [number, number]
    ): Uninserted<PricingProductTypeRow>[] =>
      acc.concat([
        {
          complexity: 'SIMPLE',
          contrast: contrast[0],
          id: uuid.v4(),
          minimum_units: units,
          name: typeName,
          pattern_minimum_cents: Dollars(100),
          unit_cents: Math.ceil(typeMediumCents * 0.75 * unitMultiplier),
          version,
          yield: typeYield
        },
        {
          complexity: 'MEDIUM',
          contrast: contrast[1],
          id: uuid.v4(),
          minimum_units: units,
          name: typeName,
          pattern_minimum_cents: Dollars(250),
          unit_cents: Math.ceil(typeMediumCents * 1 * unitMultiplier),
          version,
          yield: typeYield
        },
        {
          complexity: 'COMPLEX',
          contrast: contrast[2],
          id: uuid.v4(),
          minimum_units: units,
          name: typeName,
          pattern_minimum_cents: Dollars(400),
          unit_cents: Math.ceil(typeMediumCents * 1.75 * unitMultiplier),
          version,
          yield: typeYield
        }
      ]),
    []
  );
}
