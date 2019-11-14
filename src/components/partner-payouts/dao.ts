import rethrow = require('pg-rethrow');
import uuid from 'node-uuid';

import db from '../../services/db';
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
import { computeUniqueShortId } from '../../services/short-id';

const TABLE_NAME = 'partner_payout_logs';
const ACCOUNTS_TABLE_NAME = 'partner_payout_accounts';

export async function create(
  data: UninsertedWithoutShortId<PartnerPayoutLog>
): Promise<PartnerPayoutLog> {
  const shortId = await computeUniqueShortId();
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    shortId,
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
  const result = await db(TABLE_NAME)
    .select(
      `${TABLE_NAME}.*`,
      'collections.id AS collection_id',
      'collections.title AS collection_title'
    )
    .leftJoin(
      ACCOUNTS_TABLE_NAME,
      `${TABLE_NAME}.payout_account_id`,
      `${ACCOUNTS_TABLE_NAME}.id`
    )
    .leftJoin('invoices', 'invoices.id', `${TABLE_NAME}.invoice_id`)
    .leftJoin('pricing_bids', 'pricing_bids.id', `${TABLE_NAME}.bid_id`)
    .leftJoin('design_events', 'design_events.bid_id', 'pricing_bids.id')
    .leftJoin(
      'collection_designs',
      'collection_designs.design_id',
      'design_events.design_id'
    )
    .joinRaw(
      `LEFT JOIN collections ON
      (
        collections.id = invoices.collection_id OR
        collections.id = collection_designs.collection_id
      )`
    )
    .where({
      'partner_payout_accounts.user_id': userId,
      'partner_payout_logs.bid_id': null
    })
    .orWhere({
      'design_events.actor_id': userId,
      'design_events.type': 'ACCEPT_SERVICE_BID'
    })
    .orderByRaw(`${TABLE_NAME}.created_at DESC`)
    .catch(rethrow);

  return validateEvery<PartnerPayoutLogRowWithMeta, PartnerPayoutLogWithMeta>(
    TABLE_NAME,
    isPartnerPayoutLogRowWithMeta,
    dataAdapterForMeta,
    result
  );
}
