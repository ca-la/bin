import * as db from '../../services/db';
import Measurement, {
  dataAdapter,
  isProductDesignCanvasMeasurementRow as isMeasurementRow,
  ProductDesignCanvasMeasurementRow as MeasurementRow
} from '../../domain-objects/product-design-canvas-measurement';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_design_canvas_measurements';

export async function create(data: Uninserted<Measurement>): Promise<Measurement> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: MeasurementRow[]) =>
      first<MeasurementRow>(rows)
    );

  if (!created) { throw new Error('Failed to create a measurement'); }

  return validate<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<Measurement | null> {
  const measurements: MeasurementRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1);

  const measurement = measurements[0];
  if (!measurement) { return null; }

  return validate<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    measurement
  );
}

export async function update(id: string, data: Unsaved<Measurement>): Promise<Measurement> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null,
    id
  });
  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then((rows: MeasurementRow[]) => first<MeasurementRow>(rows));

  if (!updated) { throw new Error('Failed to update row'); }

  return validate<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    updated
  );
}

export async function deleteById(id: string): Promise<Measurement> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: MeasurementRow[]) => first<MeasurementRow>(rows));

  if (!deleted) { throw new Error('Failed to delete row'); }

  return validate<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    deleted
  );
}

export async function findAllByCanvasId(canvasId: string): Promise<Measurement[]> {
  const measurements: MeasurementRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ canvas_id: canvasId, deleted_at: null });
  return validateEvery<MeasurementRow, Measurement>(
    TABLE_NAME,
    isMeasurementRow,
    dataAdapter,
    measurements
  );
}
