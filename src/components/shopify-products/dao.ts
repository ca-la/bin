import * as Knex from "knex";

import {
  dataAdapter,
  isShopifyProductRow,
  ShopifyProduct,
  ShopifyProductRow,
} from "./domain-object";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";
import db from "../../services/db";

const TABLE_NAME = "shopify_products";

export async function create(
  data: ShopifyProduct,
  trx?: Knex.Transaction
): Promise<ShopifyProduct> {
  const rowData = dataAdapter.forInsertion(data);
  const shopifyProduct = await db(TABLE_NAME)
    .insert(rowData)
    .returning("*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((shopifyProducts: ShopifyProductRow[]) => first(shopifyProducts));

  if (!shopifyProduct) {
    throw new Error("There was a problem saving the ShopifyProduct");
  }

  return validate<ShopifyProductRow, ShopifyProduct>(
    TABLE_NAME,
    isShopifyProductRow,
    dataAdapter,
    shopifyProduct
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<ShopifyProduct | null> {
  const shopifyProduct = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((shopifyProducts: ShopifyProductRow[]) => first(shopifyProducts));

  if (!shopifyProduct) {
    return null;
  }

  return validate<ShopifyProductRow, ShopifyProduct>(
    TABLE_NAME,
    isShopifyProductRow,
    dataAdapter,
    shopifyProduct
  );
}

export async function findByShopifyId(
  shopifyId: string,
  trx?: Knex.Transaction
): Promise<ShopifyProduct[]> {
  const shopifyProducts = await db(TABLE_NAME)
    .where({ shopify_id: shopifyId, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<ShopifyProductRow, ShopifyProduct>(
    TABLE_NAME,
    isShopifyProductRow,
    dataAdapter,
    shopifyProducts
  );
}
