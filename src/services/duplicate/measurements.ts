import Knex from "knex";

import * as MeasurementsDAO from "../../components/product-design-canvas-measurements/dao";
import { ProductDesignCanvasMeasurement as Measurement } from "../../components/product-design-canvas-measurements/types";
import prepareForDuplication from "./prepare-for-duplication";

/**
 * Finds all measurements for the given canvas and creates duplicates.
 */
export async function findAndDuplicateMeasurements(
  canvasId: string,
  newCanvasId: string,
  trx: Knex.Transaction
): Promise<Measurement[]> {
  const measurements = await MeasurementsDAO.findAllByCanvasId(canvasId);
  const duplicatedMeasurements: Measurement[] = [];

  for (const measurement of measurements) {
    const newMeasurement = await MeasurementsDAO.create(
      prepareForDuplication(measurement, { canvasId: newCanvasId }),
      trx
    );

    duplicatedMeasurements.push(newMeasurement);
  }

  return duplicatedMeasurements;
}
