import * as Knex from 'knex';

import * as MeasurementsDAO from '../../dao/product-design-canvas-measurements';
import Measurement from '../../domain-objects/product-design-canvas-measurement';
import prepareForDuplication from './prepare-for-duplication';

/**
 * Finds all measurements for the given canvas and creates duplicates.
 */
export async function findAndDuplicateMeasurements(
  canvasId: string,
  newCanvasId: string,
  trx: Knex.Transaction
): Promise<Measurement[]> {
  const measurements = await MeasurementsDAO.findAllByCanvasId(canvasId);
  return Promise.all(
    measurements.map(
      (measurement: Measurement): Promise<Measurement> =>
        MeasurementsDAO.create(
          prepareForDuplication(measurement, { canvasId: newCanvasId }),
          trx
        )
    )
  );
}
