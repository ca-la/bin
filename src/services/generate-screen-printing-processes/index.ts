import { range } from 'lodash';
import * as uuid from 'node-uuid';
import { Cents } from '../dollars';
import { PricingProcessRow } from '../../domain-objects/pricing-process';

type UninsertedPricingProcessRow = Uninserted<PricingProcessRow>;
/**
 * Generate a set of screen printing process rows
 */
export default function generateScreenPrintingProcess(
  setup: (units: number) => number,
  perHit: Cents,
  minimumUnitsAndUnitCost: [number, number][],
  version: number
): UninsertedPricingProcessRow[] {
  return minimumUnitsAndUnitCost.reduce(
    (
      acc: UninsertedPricingProcessRow[],
      [units, base]: [number, number]
    ): UninsertedPricingProcessRow[] => {
      return acc.concat(
        range(1, 10).reduce(
          (
            rowsForUnits: UninsertedPricingProcessRow[],
            colorCount: number
          ): UninsertedPricingProcessRow[] => {
            return rowsForUnits.concat({
              complexity:
                '' + colorCount + '_COLOR' + (colorCount > 1 ? 'S' : ''),
              id: uuid.v4(),
              minimum_units: units,
              name: 'SCREEN_PRINTING',
              setup_cents: colorCount * setup(units),
              unit_cents: base + colorCount * perHit,
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
