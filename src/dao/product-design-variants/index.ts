import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import rethrow = require('pg-rethrow');

import * as db from '../../services/db';
import filterError = require('../../services/filter-error');
import InvalidDataError = require('../../errors/invalid-data');
import ProductDesignVariant, {
  dataAdapter,
  isProductDesignVariantRow,
  ProductDesignVariantRow
} from '../../domain-objects/product-design-variant';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_design_variants';

export async function create(
  data: Uninserted<ProductDesignVariant>,
  trx?: Knex.Transaction
): Promise<ProductDesignVariant> {
  const rowData = dataAdapter.forInsertion({ ...data });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: ProductDesignVariantRow[]) => first<ProductDesignVariantRow>(rows));
  if (!created) { throw new Error('Failed to create a product design variant!'); }
  return validate<ProductDesignVariantRow, ProductDesignVariant>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<ProductDesignVariant | null> {
  const productDesignVariants: ProductDesignVariantRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .limit(1);
  const productDesignVariant = productDesignVariants[0];
  if (!productDesignVariant) { return null; }
  return validate<ProductDesignVariantRow, ProductDesignVariant>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    productDesignVariant
  );
}

export async function deleteForDesign(trx: Knex.Transaction, designId: string): Promise<number> {
  return await db(TABLE_NAME)
    .transacting(trx)
    .where({ design_id: designId })
    .del();
}

export async function createForDesign(
  trx: Knex.Transaction,
  designId: string,
  variants: Uninserted<ProductDesignVariant>[]
): Promise<ProductDesignVariant[]> {
  if (variants.length === 0) { return []; }

  const rowsForInsertion = variants.map((
    data: Uninserted<ProductDesignVariant>
  ): Uninserted<ProductDesignVariantRow> => {
    if (!data.colorName && !data.sizeName) {
      throw new InvalidDataError('Color name or size name must be provided');
    }
    return dataAdapter.forInsertion({
      ...data,
      designId,
      id: data.id || uuid.v4()
    });
  });

  const variantRows: ProductDesignVariantRow[] = await db(TABLE_NAME)
    .transacting(trx)
    .insert(rowsForInsertion, '*')
    .orderBy('position', 'asc')
    .catch(rethrow)
    .catch(filterError(
      rethrow.ERRORS.UniqueViolation,
      (err: typeof rethrow.ERRORS.UniqueViolation) => {
        if (err.constraint === 'product_design_variant_position') {
          throw new InvalidDataError('Cannot create two variants with the same position');
        }
        throw err;
      }
    ));

  return validateEvery<ProductDesignVariantRow, ProductDesignVariant>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    variantRows
  );
}

export async function replaceForDesign(
  designId: string,
  variants: Uninserted<ProductDesignVariant>[]
): Promise<ProductDesignVariant[]> {
  return db.transaction(async (trx: Knex.Transaction): Promise<ProductDesignVariant[]> => {
    await deleteForDesign(trx, designId);
    return createForDesign(trx, designId, variants)
      .then((createdVariants: ProductDesignVariant[]) => trx.commit(createdVariants))
      .catch(() => trx.rollback());
  });
}

export async function findByDesignId(designId: string): Promise<ProductDesignVariant[]> {
  const variants = await db(TABLE_NAME)
    .where({ design_id: designId })
    .orderBy('position', 'asc')
    .catch(rethrow);

  return validateEvery<ProductDesignVariantRow, ProductDesignVariant>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    variants
  );
}

export async function getTotalUnitsToProduce(designId: string): Promise<number> {
  const response = await db.raw(`
    select sum(units_to_produce)
      from product_design_variants
      where design_id = ?;
  `, [designId]);
  const { sum } = response.rows[0];
  return Number(sum || 0);
}

export async function getSizes(designId: string): Promise<(string | null)[]> {
  interface SizeRow { size_name: string | null; }
  return await db(TABLE_NAME)
    .distinct('size_name')
    .where({ design_id: designId })
    .andWhere('units_to_produce', '>', 0)
    .then((rows: SizeRow[]) => rows.map((row: SizeRow): string | null => row.size_name));
}
