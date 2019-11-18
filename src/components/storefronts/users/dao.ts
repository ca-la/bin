import * as Knex from 'knex';
import db from '../../../services/db';
import first from '../../../services/first';
import StorefrontUser, {
  dataAdapter,
  isStorefrontUserRow,
  StorefrontUserRow
} from './domain-object';
import { validate } from '../../../services/validate-from-db';

const TABLE_NAME = 'storefront_users';

export async function create(
  data: StorefrontUser,
  trx: Knex.Transaction
): Promise<StorefrontUser> {
  const rowData = dataAdapter.forInsertion(data);
  const storefrontUser = await trx(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then((storefrontUsers: StorefrontUserRow[]) => first(storefrontUsers));

  if (!storefrontUser) {
    throw new Error('There was a problem saving the StorefrontUser');
  }

  return validate<StorefrontUserRow, StorefrontUser>(
    TABLE_NAME,
    isStorefrontUserRow,
    dataAdapter,
    storefrontUser
  );
}

export async function findByUserAndStorefront(
  userId: string,
  storefrontId: string,
  trx?: Knex.Transaction
): Promise<StorefrontUser | null> {
  const storefrontUser = await db(TABLE_NAME)
    .where({ user_id: userId, storefront_id: storefrontId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((storefrontUsers: StorefrontUserRow[]) => first(storefrontUsers));

  if (!storefrontUser) {
    return null;
  }

  return validate<StorefrontUserRow, StorefrontUser>(
    TABLE_NAME,
    isStorefrontUserRow,
    dataAdapter,
    storefrontUser
  );
}
