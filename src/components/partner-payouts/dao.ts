import rethrow = require('pg-rethrow');
import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import {
  dataAdapter,
  dataAdapterForMeta,
  isPartnerPayoutLogRow,
  isPartnerPayoutLogRowWithMeta,
  PartnerPayoutLog,
  PartnerPayoutLogRow,
  PartnerPayoutLogRowWithMeta,
  PartnerPayoutLogWithMeta
} from './domain-object';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'partner_payout_logs';
const ACCOUNTS_TABLE_NAME = 'partner_payout_accounts';

export async function create(
  data: Uninserted<PartnerPayoutLog>
): Promise<PartnerPayoutLog> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data
  });

  const result = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: PartnerPayoutLogRow[]) => first(rows))
    .catch(rethrow);

  if (!result) {
    throw new Error('Unable to create a new partner payout.');
  }

  return validate<PartnerPayoutLogRow, PartnerPayoutLog>(
    TABLE_NAME,
    isPartnerPayoutLogRow,
    dataAdapter,
    result
  );
}

export async function findByPayoutAccountId(
  accountId: string
): Promise<PartnerPayoutLog[]> {
  const result = await db(TABLE_NAME)
    .where({
      payout_account_id: accountId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow);

  return validateEvery<PartnerPayoutLogRow, PartnerPayoutLog>(
    TABLE_NAME,
    isPartnerPayoutLogRow,
    dataAdapter,
    result
  );
}

export async function findByUserId(
  userId: string
): Promise<PartnerPayoutLogWithMeta[]> {
  const result = await db(ACCOUNTS_TABLE_NAME)
    .select(
      `${TABLE_NAME}.*`,
      'collections.id AS collection_id',
      'collections.title AS collection_title'
    )
    .joinRaw(
      `INNER JOIN ${TABLE_NAME} on ${TABLE_NAME}.payout_account_id = ${ACCOUNTS_TABLE_NAME}.id`
    )
    .joinRaw(`INNER JOIN invoices ON invoices.id = ${TABLE_NAME}.invoice_id`)
    .joinRaw('LEFT JOIN collections ON collections.id = invoices.collection_id')
    .whereRaw(`${ACCOUNTS_TABLE_NAME}.user_id = ?`, userId)
    .orderByRaw(`${ACCOUNTS_TABLE_NAME}.created_at DESC`)
    .catch(rethrow);

  return validateEvery<PartnerPayoutLogRowWithMeta, PartnerPayoutLogWithMeta>(
    TABLE_NAME,
    isPartnerPayoutLogRowWithMeta,
    dataAdapterForMeta,
    result
  );
}
