import * as uuid from 'node-uuid';
import * as db from '../../services/db';
import Annotation, {
  dataAdapter,
  isProductDesignCanvasAnnotationRow as isAnnotationRow,
  ProductDesignCanvasAnnotationRow as AnnotationRow
} from '../../domain-objects/product-design-canvas-annotation';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_design_canvas_annotations';

export async function create(data: Uninserted<Annotation>): Promise<Annotation> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null,
    id: uuid.v4()
  });

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: AnnotationRow[]) => first<AnnotationRow>(rows));

  if (!created) { throw new Error('Failed to create a annotation'); }

  return validate<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<Annotation | null> {
  const annotations: AnnotationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1);

  const annotation = annotations[0];

  if (!annotation) { return null; }

  return validate<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    annotation
  );
}

export async function update(id: string, data: Unsaved<Annotation>): Promise<Annotation> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null,
    id
  });

  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then((rows: AnnotationRow[]) => first<AnnotationRow>(rows));

  if (!updated) { throw new Error('Failed to update row'); }

  return validate<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    updated
  );
}

export async function deleteById(id: string): Promise<Annotation> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: AnnotationRow[]) => first<AnnotationRow>(rows));

  if (!deleted) { throw new Error('Failed to delete row'); }

  return validate<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    deleted
  );
}

export async function findAllByCanvasId(canvasId: string): Promise<Annotation[]> {
  const annotations: AnnotationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ canvas_id: canvasId, deleted_at: null });
  return validateEvery<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    annotations
  );
}
