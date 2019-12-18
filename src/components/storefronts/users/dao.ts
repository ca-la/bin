import * as Knex from 'knex';
import first from '../../../services/first';
import StorefrontUser, {
  dataAdapter,
  isStorefrontUserRow,
  StorefrontUserRow
} from './domain-object';
import { validate } from '../../../services/validate-from-db';

const TABLE_NAME = 'storefront_users';

export async function create(options: {
  data: StorefrontUser;
  trx: Knex.Transaction;
}): Promise<StorefrontUser> {
  const { data, trx } = options;
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

export async function findByUserAndStorefront(options: {
  userId: string;
  storefrontId: string;
  trx: Knex.Transaction;
}): Promise<StorefrontUser | null> {
  const { userId, storefrontId, trx } = options;
  const storefrontUser = await trx(TABLE_NAME)
    .where({ user_id: userId, storefront_id: storefrontId })
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
