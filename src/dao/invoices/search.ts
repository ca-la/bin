import Knex from 'knex';
import rethrow = require('pg-rethrow');

import db from '../../services/db';
import Invoice = require('../../domain-objects/invoice');
import limitOrOffset from '../../services/limit-or-offset';

const TABLE_VIEW_NAME = 'invoice_with_payments';

const instantiate = (row: any): Invoice => {
  return new Invoice(row);
};

export async function getInvoicesByUser(options: {
  limit?: number;
  offset?: number;
  trx?: Knex.Transaction;
  userId: string;
}): Promise<Invoice[]> {
  return db
    .select('*')
    .from(TABLE_VIEW_NAME)
    .where({ deleted_at: null, user_id: options.userId })
    .orderBy('created_at', 'desc')
    .modify(limitOrOffset(options.limit, options.offset))
    .modify((query: Knex.QueryBuilder) => {
      if (options.trx) {
        query.transacting(options.trx);
      }
    })
    .then((invoices: any) => invoices.map(instantiate))
    .catch(rethrow);
}
