import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../services/db';
import first from '../../services/first';
import {
  dataAdapter,
  isSubscriptionRow,
  partialDataAdapter,
  Subscription,
  SubscriptionRow
} from './domain-object';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'subscriptions';

export async function create(
  data: Uninserted<Subscription>,
  trx: Knex.Transaction
): Promise<Subscription> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4()
  });

  const res = await trx(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: SubscriptionRow[]) => first(rows));

  return validate<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}

export async function findForUser(
  userId: string,
  trx: Knex.Transaction
): Promise<Subscription[]> {
  const res = await db(TABLE_NAME)
    .transacting(trx)
    .where({ user_id: userId }, '*');

  return validateEvery<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}

export async function update(
  id: string,
  data: Partial<Subscription>,
  trx: Knex.Transaction
): Promise<Subscription> {
  const rowData = partialDataAdapter.forInsertion(data);

  const res = await trx(TABLE_NAME)
    .where({ id })
    .update(rowData, '*')
    .then((rows: SubscriptionRow[]) => first(rows));

  return validate<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}
