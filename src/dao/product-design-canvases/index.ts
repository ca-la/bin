import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../services/db';
import ProductDesignCanvas, {
  dataAdapter,
  isProductDesignCanvasRow,
  partialDataAdapter,
  ProductDesignCanvasRow
} from '../../domain-objects/product-design-canvas';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_design_canvases';

export class CanvasNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = 'CanvasNotFoundError';
  }
}

export async function create(
  data: MaybeUnsaved<ProductDesignCanvas>,
  trx?: Knex.Transaction
): Promise<ProductDesignCanvas> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
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
    .then((rows: ProductDesignCanvasRow[]) =>
      first<ProductDesignCanvasRow>(rows)
    );

  if (!created) {
    throw new Error('Failed to create rows');
  }

  return validate<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    created
  );
}

export async function update(
  id: string,
  data: Unsaved<ProductDesignCanvas>
): Promise<ProductDesignCanvas> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null,
    id
  });
  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then((rows: ProductDesignCanvasRow[]) =>
      first<ProductDesignCanvasRow>(rows)
    );

  if (!updated) {
    throw new CanvasNotFoundError("Can't update canvas; canvas not found");
  }

  return validate<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    updated
  );
}

export interface ReorderRequest {
  id: string;
  ordering: number;
}

export async function reorder(
  data: ReorderRequest[]
): Promise<ProductDesignCanvas[]> {
  let updated: ProductDesignCanvasRow[] = [];
  await db.transaction(async (trx: Knex.Transaction) => {
    updated = await Promise.all(
      data.map(async (reorderReq: ReorderRequest) => {
        const { id, ordering } = reorderReq;
        const rowData = partialDataAdapter.forInsertion({
          ordering
        });
        const row = await db(TABLE_NAME)
          .update(rowData, '*')
          .where({ id })
          .transacting(trx)
          .then((rows: ProductDesignCanvasRow[]) =>
            first<ProductDesignCanvasRow>(rows)
          );
        if (!row) {
          throw new Error('Row could not be updated');
        }
        return row;
      })
    );
  });

  return validateEvery<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    updated
  );
}

export async function del(id: string): Promise<ProductDesignCanvas> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: ProductDesignCanvasRow[]) =>
      first<ProductDesignCanvasRow>(rows)
    );

  if (!deleted) {
    throw new CanvasNotFoundError("Can't delete canvas; canvas not found");
  }

  return validate<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    deleted
  );
}

export async function findById(
  id: string
): Promise<ProductDesignCanvas | null> {
  const canvas = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1)
    .then((rows: ProductDesignCanvasRow[]) =>
      first<ProductDesignCanvasRow>(rows)
    );

  if (!canvas) {
    return null;
  }

  return validate<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    canvas
  );
}

export async function findAllByDesignId(
  id: string
): Promise<ProductDesignCanvas[]> {
  const canvases: ProductDesignCanvasRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ design_id: id, deleted_at: null })
    .orderBy('ordering');

  return validateEvery<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    canvases
  );
}

export async function findByComponentId(
  componentId: string
): Promise<ProductDesignCanvas | null> {
  const canvas = await db(TABLE_NAME)
    .select('*')
    .where({ component_id: componentId, deleted_at: null })
    .limit(1)
    .then((rows: ProductDesignCanvasRow[]) =>
      first<ProductDesignCanvasRow>(rows)
    );

  if (!canvas) {
    return null;
  }

  return validate<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    canvas
  );
}
