import Knex from 'knex';
import {
  BidRejection,
  BidRejectionRow,
  dataAdapter,
  isBidRejectionRow
} from './domain-object';
import db from '../../services/db';
import { first } from 'lodash';
import uuid = require('node-uuid');
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'bid_rejections';

export async function create(
  data: Unsaved<BidRejection>,
  trx?: Knex.Transaction
): Promise<BidRejection> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: object[]) => first(rows));

  if (!created) {
    throw new Error('Failed to create bid rejection reasons.');
  }

  return validate<BidRejectionRow, BidRejection>(
    TABLE_NAME,
    isBidRejectionRow,
    dataAdapter,
    created
  );
}

export async function findByBidId(bidId: string): Promise<BidRejection | null> {
  const bidRejection: BidRejectionRow | undefined = await db(TABLE_NAME)
    .select('*')
    .where({ bid_id: bidId })
    .then((bidRejections: BidRejectionRow[]) => first(bidRejections));

  if (!bidRejection) {
    return null;
  }

  return validate<BidRejectionRow, BidRejection>(
    TABLE_NAME,
    isBidRejectionRow,
    dataAdapter,
    bidRejection
  );
}
