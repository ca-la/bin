import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import ProductDesignCanvas, {
  dataAdapter,
  isProductDesignCanvasRow,
  ProductDesignCanvasRow
} from '../../domain-objects/product-design-canvas';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_design_canvases';

export async function create(
  data: MaybeUnsaved<ProductDesignCanvas>
): Promise<ProductDesignCanvas> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: ProductDesignCanvasRow[]) => first<ProductDesignCanvasRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

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
    .then((rows: ProductDesignCanvasRow[]) => first<ProductDesignCanvasRow>(rows));

  if (!updated) { throw new Error('Failed to update rows'); }

  return validate<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    updated
  );
}

export async function del(id: string): Promise<ProductDesignCanvas> {
  const created = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: ProductDesignCanvasRow[]) => first<ProductDesignCanvasRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<ProductDesignCanvas | null> {
  const canvas = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1)
    .then((rows: ProductDesignCanvasRow[]) => first<ProductDesignCanvasRow>(rows));

  if (!canvas) { return null; }

  return validate<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    canvas
  );
}

export async function findAllByDesignId(id: string): Promise<ProductDesignCanvas[]> {
  const canvases: ProductDesignCanvasRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ design_id: id, deleted_at: null });

  return validateEvery<ProductDesignCanvasRow, ProductDesignCanvas>(
    TABLE_NAME,
    isProductDesignCanvasRow,
    dataAdapter,
    canvases
  );
}
