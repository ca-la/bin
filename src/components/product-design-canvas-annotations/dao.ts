import * as Knex from 'knex';
import { pick } from 'lodash';
import * as db from '../../services/db';
import Annotation, {
  dataAdapter,
  isProductDesignCanvasAnnotationRow as isAnnotationRow,
  parseNumerics,
  parseNumericsList,
  ProductDesignCanvasAnnotationRow as AnnotationRow,
  UPDATABLE_PROPERTIES
} from './domain-object';
import ResourceNotFoundError from '../../errors/resource-not-found';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_design_canvas_annotations';

export async function create(
  data: Uninserted<Annotation>,
  trx?: Knex.Transaction
): Promise<Annotation> {
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
    .then((rows: AnnotationRow[]) => first<AnnotationRow>(rows));

  if (!created) { throw new Error('Failed to create a annotation'); }

  return parseNumerics(validate<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    created
  ));
}

export async function findById(id: string): Promise<Annotation | null> {
  const annotations: AnnotationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1);

  const annotation = annotations[0];

  if (!annotation) { return null; }

  return parseNumerics(validate<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    annotation
  ));
}

export async function update(id: string, data: Annotation): Promise<Annotation> {
  const rowData = pick(dataAdapter.forInsertion(data), UPDATABLE_PROPERTIES);
  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then((rows: AnnotationRow[]) => first<AnnotationRow>(rows));

  if (!updated) { throw new Error('Failed to update row'); }

  return parseNumerics(validate<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    updated
  ));
}

export async function deleteById(id: string): Promise<Annotation> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: AnnotationRow[]) => first<AnnotationRow>(rows));

  if (!deleted) { throw new ResourceNotFoundError('Failed to delete row'); }

  return parseNumerics(validate<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    deleted
  ));
}

export async function findAllByCanvasId(canvasId: string): Promise<Annotation[]> {
  const annotations: AnnotationRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ canvas_id: canvasId, deleted_at: null });
  return parseNumericsList(validateEvery<AnnotationRow, Annotation>(
    TABLE_NAME,
    isAnnotationRow,
    dataAdapter,
    annotations
  ));
}
