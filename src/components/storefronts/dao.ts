import * as uuid from "node-uuid";
import * as Knex from "knex";
import db from "../../services/db";
import first from "../../services/first";
import Storefront, {
  dataAdapter,
  isStorefrontRow,
  StorefrontRow,
  unsavedDataAdapter,
} from "./domain-object";
import { validate } from "../../services/validate-from-db";

const TABLE_NAME = "storefronts";

export async function create(options: {
  trx: Knex.Transaction;
  data: Unsaved<Storefront>;
}): Promise<Storefront> {
  const { trx, data } = options;
  const rowData = unsavedDataAdapter.forInsertion(data);
  const storefront = await trx(TABLE_NAME)
    .insert({ ...rowData, id: uuid.v4() })
    .returning("*")
    .then((storefronts: StorefrontRow[]) => first(storefronts));

  if (!storefront) {
    throw new Error("There was a problem saving the Storefront");
  }

  return validate<StorefrontRow, Storefront>(
    TABLE_NAME,
    isStorefrontRow,
    dataAdapter,
    storefront
  );
}

export async function findById(options: {
  trx: Knex.Transaction;
  id: string;
}): Promise<Storefront | null> {
  const { trx, id } = options;
  const storefront = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((storefronts: StorefrontRow[]) => first(storefronts));

  if (!storefront) {
    return null;
  }

  return validate<StorefrontRow, Storefront>(
    TABLE_NAME,
    isStorefrontRow,
    dataAdapter,
    storefront
  );
}

export async function findByUserId(options: {
  trx: Knex.Transaction;
  userId: string;
}): Promise<Storefront | null> {
  const { trx, userId } = options;
  const storefront = await trx(TABLE_NAME)
    .select("storefronts.*")
    .join(
      "storefront_users",
      "storefronts.id",
      "storefront_users.storefront_id"
    )
    .where({ user_id: userId, deleted_at: null })
    .then((storefronts: StorefrontRow[]) => first(storefronts));

  if (!storefront) {
    return null;
  }

  return validate<StorefrontRow, Storefront>(
    TABLE_NAME,
    isStorefrontRow,
    dataAdapter,
    storefront
  );
}
