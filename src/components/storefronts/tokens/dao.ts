import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import db from '../../../services/db';
import first from '../../../services/first';
import StorefrontToken, {
  dataAdapter,
  isStorefrontTokenRow,
  StorefrontTokenRow,
  unsavedDataAdapter
} from './domain-object';
import { validate, validateEvery } from '../../../services/validate-from-db';

const TABLE_NAME = 'storefront_integration_tokens';

export async function create(
  data: Unsaved<StorefrontToken>,
  trx: Knex.Transaction
): Promise<StorefrontToken> {
  const rowData = unsavedDataAdapter.forInsertion(data);
  const storefrontToken = await trx(TABLE_NAME)
    .insert({ ...rowData, id: uuid.v4() })
    .returning('*')
    .then((storefrontTokens: StorefrontTokenRow[]) => first(storefrontTokens));

  if (!storefrontToken) {
    throw new Error('There was a problem saving the StorefrontToken');
  }

  return validate<StorefrontTokenRow, StorefrontToken>(
    TABLE_NAME,
    isStorefrontTokenRow,
    dataAdapter,
    storefrontToken
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<StorefrontToken | null> {
  const storefrontToken = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((storefrontTokens: StorefrontTokenRow[]) => first(storefrontTokens));

  if (!storefrontToken) {
    return null;
  }

  return validate<StorefrontTokenRow, StorefrontToken>(
    TABLE_NAME,
    isStorefrontTokenRow,
    dataAdapter,
    storefrontToken
  );
}

export async function findByStorefront(
  storefrontId: string,
  trx?: Knex.Transaction
): Promise<StorefrontToken[]> {
  const storefrontTokens = await db(TABLE_NAME)
    .where({ storefront_id: storefrontId, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<StorefrontTokenRow, StorefrontToken>(
    TABLE_NAME,
    isStorefrontTokenRow,
    dataAdapter,
    storefrontTokens
  );
}
