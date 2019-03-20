import rethrow = require('pg-rethrow');
import * as Knex from 'knex';

import * as db from '../../services/db';
import filterError = require('../../services/filter-error');
import InvalidDataError = require('../../errors/invalid-data');
import { pick } from 'lodash';
import Measurement, {
  dataAdapter,
  isProductDesignCanvasMeasurementRow as isMeasurementRow,
  parseNumerics,
  parseNumericsList,
  ProductDesignCanvasMeasurementRow as MeasurementRow,
  UPDATABLE_PROPERTIES
} from '../../domain-objects/product-design-canvas-measurement';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import generateLabel from '../../services/generate-label';

const TABLE_NAME = 'product_design_canvas_measurements';

interface CountRow {
  count: number;
}

export class MeasurementNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = 'MeasurementNotFoundError';
  }
}

function handleForeignKeyViolation(
  canvasId: string,
  err: typeof rethrow.ERRORS.ForeignKeyViolation
): never {
  if (err.constraint === 'product_design_canvas_measurements_canvas_id_fkey') {
    throw new InvalidDataError(`Invalid canvas ID: ${canvasId}`);
  }

  throw err;
}

export async function create(
  data: Uninserted<Measurement>,
  trx?: Knex.Transaction
): Promise<Measurement> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: MeasurementRow[]) =>
      first<MeasurementRow>(rows)
    )
    .catch(rethrow)
    .catch(filterError(
      rethrow.ERRORS.ForeignKeyViolation,
      handleForeignKeyViolation.bind(null, data.canvasId)
    ));

  if (!created) { throw new Error('Failed to create a measurement'); }

  return parseNumerics(validate<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    created
  ));
}

export async function findById(id: string): Promise<Measurement | null> {
  const measurements: MeasurementRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1);

  const measurement = measurements[0];
  if (!measurement) { return null; }

  return parseNumerics(validate<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    measurement
  ));
}

export async function update(id: string, data: Measurement): Promise<Measurement> {
  const rowData = pick(dataAdapter.forInsertion(data), UPDATABLE_PROPERTIES);

  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then((rows: MeasurementRow[]) => first<MeasurementRow>(rows))
    .catch(rethrow)
    .catch(filterError(
      rethrow.ERRORS.ForeignKeyViolation,
      handleForeignKeyViolation.bind(null, data.canvasId)
    ));

  if (!updated) {
    throw new MeasurementNotFoundError('Measurement not found');
  }

  return parseNumerics(validate<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    updated
  ));
}

export async function deleteById(id: string): Promise<Measurement> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: MeasurementRow[]) => first<MeasurementRow>(rows));

  if (!deleted) {
    throw new MeasurementNotFoundError('Measurement not found');
  }

  return parseNumerics(validate<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    deleted
  ));
}

export async function findAllByCanvasId(canvasId: string): Promise<Measurement[]> {
  const measurements: MeasurementRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ canvas_id: canvasId, deleted_at: null })
    .orderBy('created_at', 'desc');
  return parseNumericsList(validateEvery<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    measurements
  ));
}

export async function getLabel(canvasId: string): Promise<string> {
  const measurementCount = await db(TABLE_NAME)
    .count('*')
    .where({ canvas_id: canvasId })
    .then((rows: CountRow[]) => first<CountRow>(rows));
  if (!measurementCount) {
    throw new Error(`Failed to count rows for canvasId ${canvasId}`);
  }
  return generateLabel(measurementCount.count);
}
