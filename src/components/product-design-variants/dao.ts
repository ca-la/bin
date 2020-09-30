import uuid from "node-uuid";
import Knex from "knex";
import rethrow = require("pg-rethrow");
import { VariantDb } from "./types";

import db from "../../services/db";
import filterError = require("../../services/filter-error");
import InvalidDataError = require("../../errors/invalid-data");
import {
  dataAdapter,
  isProductDesignVariantRow,
  partialDataAdapter,
  ProductDesignVariantRow,
} from "./domain-object";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "product_design_variants";

export async function create(
  data: Uninserted<VariantDb>,
  trx?: Knex.Transaction
): Promise<VariantDb> {
  const rowData = dataAdapter.forInsertion({ ...data });
  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: ProductDesignVariantRow[]) =>
      first<ProductDesignVariantRow>(rows)
    );
  if (!created) {
    throw new Error("Failed to create a product design variant!");
  }
  return validate<ProductDesignVariantRow, VariantDb>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    created
  );
}

export async function updateEmptySkuByUpc(
  trx: Knex.Transaction,
  upc: string,
  sku: string
): Promise<VariantDb[]> {
  const updated = await trx(TABLE_NAME).update({ sku }, "*").where({
    universal_product_code: upc,
    sku: null,
  });
  if (!updated) {
    throw new Error(`Failed to update product design variants by upc #${upc}!`);
  }
  return validateEvery<ProductDesignVariantRow, VariantDb>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    updated
  );
}

export async function update(
  id: string,
  data: Partial<VariantDb>,
  trx?: Knex.Transaction
): Promise<VariantDb> {
  const rowData = partialDataAdapter.toDb(data);
  const updated = await db(TABLE_NAME)
    .update(rowData, "*")
    .where({ id })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: ProductDesignVariantRow[]) =>
      first<ProductDesignVariantRow>(rows)
    );
  if (!updated) {
    throw new Error(`Failed to update product design variant #${id}!`);
  }
  return validate<ProductDesignVariantRow, VariantDb>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    updated
  );
}

export async function findById(id: string): Promise<VariantDb | null> {
  const productDesignVariants: ProductDesignVariantRow[] = await db(TABLE_NAME)
    .select("*")
    .where({ id })
    .limit(1);
  const productDesignVariant = productDesignVariants[0];
  if (!productDesignVariant) {
    return null;
  }
  return validate<ProductDesignVariantRow, VariantDb>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    productDesignVariant
  );
}

export async function deleteForDesign(
  trx: Knex.Transaction,
  designId: string
): Promise<number> {
  return await db(TABLE_NAME)
    .transacting(trx)
    .where({ design_id: designId })
    .del();
}

export async function createForDesign(
  trx: Knex.Transaction,
  designId: string,
  variants: Uninserted<VariantDb>[]
): Promise<VariantDb[]> {
  if (variants.length === 0) {
    return [];
  }

  const rowsForInsertion = variants.map(
    (data: Uninserted<VariantDb>): Uninserted<ProductDesignVariantRow> => {
      if (!data.colorName && !data.sizeName) {
        throw new InvalidDataError("Color name or size name must be provided");
      }
      return dataAdapter.forInsertion({
        ...data,
        designId,
        id: data.id || uuid.v4(),
      });
    }
  );

  const variantRows: ProductDesignVariantRow[] = await db(TABLE_NAME)
    .transacting(trx)
    .insert(rowsForInsertion, "*")
    .orderBy("position", "asc")
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.UniqueViolation,
        (err: typeof rethrow.ERRORS.UniqueViolation) => {
          if (err.constraint === "product_design_variant_position") {
            throw new InvalidDataError(
              "Cannot create two variants with the same position"
            );
          }
          throw err;
        }
      )
    );

  return validateEvery<ProductDesignVariantRow, VariantDb>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    variantRows
  );
}

export async function replaceForDesign(
  trx: Knex.Transaction,
  designId: string,
  variants: Uninserted<VariantDb>[]
): Promise<VariantDb[]> {
  await deleteForDesign(trx, designId);
  return createForDesign(trx, designId, variants);
}

export async function findByDesignId(designId: string): Promise<VariantDb[]> {
  const variants = await db(TABLE_NAME)
    .where({ design_id: designId })
    .orderBy("position", "asc")
    .catch(rethrow);

  return validateEvery<ProductDesignVariantRow, VariantDb>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    variants
  );
}

export async function findByCollectionId(
  collectionId: string,
  trx?: Knex.Transaction
): Promise<VariantDb[]> {
  const variants = await db(TABLE_NAME)
    .select("product_design_variants.*")
    .from(TABLE_NAME)
    .join(
      "collection_designs",
      "collection_designs.design_id",
      "product_design_variants.design_id"
    )
    .where({ "collection_designs.collection_id": collectionId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .catch(rethrow);

  return validateEvery<ProductDesignVariantRow, VariantDb>(
    TABLE_NAME,
    isProductDesignVariantRow,
    dataAdapter,
    variants
  );
}

export async function getTotalUnitsToProduce(
  designId: string
): Promise<number> {
  const response = await db.raw(
    `
    select sum(units_to_produce)
      from product_design_variants
      where design_id = ?;
  `,
    [designId]
  );
  const { sum } = response.rows[0];
  return Number(sum || 0);
}

export async function getSizes(designId: string): Promise<(string | null)[]> {
  interface SizeRow {
    size_name: string | null;
  }
  return await db(TABLE_NAME)
    .distinct("size_name")
    .where({ design_id: designId })
    .andWhere("units_to_produce", ">", 0)
    .then((rows: SizeRow[]) =>
      rows.map((row: SizeRow): string | null => row.size_name)
    );
}
