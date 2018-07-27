import { range } from 'lodash';
import * as uuid from 'node-uuid';
import { Dollars } from '../dollars';
import { PricingProcessRow } from '../../domain-objects/pricing-process';

type UninsertedPricingProcessRow = Uninserted<PricingProcessRow>;
/**
 * Generate a set of screen printing process rows
 */
export default function generateScreenPrintingProcess(
  setup: (units: number) => number,
  perHit: Dollars,
  minimumUnitsAndUnitCost: [number, number][],
  version: number
): UninsertedPricingProcessRow[] {
  return minimumUnitsAndUnitCost.reduce(
    (
      acc: UninsertedPricingProcessRow[],
      [units, base]: [number, number]
    ): UninsertedPricingProcessRow[] => {
      return acc.concat(
        range(1, 10)
          .reduce(
            (
              rowsForUnits: UninsertedPricingProcessRow[],
              colorCount: number
            ): UninsertedPricingProcessRow[] => {
              return rowsForUnits.concat({
                complexity: '' + colorCount,
                id: uuid.v4(),
                minimum_units: units,
                name: 'Screen printing',
                setup_cents: colorCount * setup(units),
                unit_cents: base + (colorCount * perHit),
                version
              });
            },
            []
          )
      );
    },
    []
  );
}
