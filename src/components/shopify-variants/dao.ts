import * as Knex from "knex";

import {
  dataAdapter,
  isShopifyVariantRow,
  ShopifyVariant,
  ShopifyVariantRow,
} from "./domain-object";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";
import db from "../../services/db";

const TABLE_NAME = "shopify_variants";

export async function create(
  data: ShopifyVariant,
  trx?: Knex.Transaction
): Promise<ShopifyVariant> {
  const rowData = dataAdapter.forInsertion(data);
  const shopifyVariant = await db(TABLE_NAME)
    .insert(rowData)
    .returning("*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((shopifyVariants: ShopifyVariantRow[]) => first(shopifyVariants));

  if (!shopifyVariant) {
    throw new Error("There was a problem saving the ShopifyVariant");
  }

  return validate<ShopifyVariantRow, ShopifyVariant>(
    TABLE_NAME,
    isShopifyVariantRow,
    dataAdapter,
    shopifyVariant
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<ShopifyVariant | null> {
  const shopifyVariant = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((shopifyVariants: ShopifyVariantRow[]) => first(shopifyVariants));

  if (!shopifyVariant) {
    return null;
  }

  return validate<ShopifyVariantRow, ShopifyVariant>(
    TABLE_NAME,
    isShopifyVariantRow,
    dataAdapter,
    shopifyVariant
  );
}

export async function findByShopifyId(
  id: string,
  trx?: Knex.Transaction
): Promise<ShopifyVariant[]> {
  const shopifyVariants = await db(TABLE_NAME)
    .where({ shopify_id: id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<ShopifyVariantRow, ShopifyVariant>(
    TABLE_NAME,
    isShopifyVariantRow,
    dataAdapter,
    shopifyVariants
  );
}
