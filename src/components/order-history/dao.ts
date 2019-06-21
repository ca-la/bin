import * as Knex from 'knex';
import rethrow = require('pg-rethrow');

import * as db from '../../services/db';
import { validateEvery } from '../../services/validate-from-db';
import {
  isOrderHistoryRow,
  OrderHistory,
  orderHistoryDataAdapter,
  OrderHistoryRow
} from './domain-object';
import limitOrOffset from '../../services/limit-or-offset';

const ORDER_HISTORY_VIEW_NAME = 'invoice_with_payments';

/**
 * Fetches invoice line item information for the given user.
 */
export async function getOrderHistoryByUserId(options: {
  limit?: number;
  offset?: number;
  trx?: Knex.Transaction;
  userId: string;
}): Promise<OrderHistory[]> {
  const rows = await db(ORDER_HISTORY_VIEW_NAME)
    .select(
      'li.id AS line_item_id',
      'li.invoice_id AS invoice_id',
      'li.design_id AS design_id',
      'designs.title AS design_title',
      'designs.collections AS design_collections',
      'designs.image_ids AS design_image_ids',
      'i.created_at AS created_at',
      'i.total_cents AS total_cost_cents',
      'q.units AS units',
      'q.unit_cost_cents AS base_unit_cost_cents'
    )
    .from('invoices AS i')
    .leftJoin('line_items AS li', 'li.invoice_id', 'i.id')
    .leftJoin('pricing_quotes AS q', 'q.id', 'li.quote_id')
    .leftJoin(
      'product_designs_with_metadata AS designs',
      'designs.id',
      'li.design_id'
    )
    .where({ 'i.user_id': options.userId })
    .orderBy('i.created_at', 'DESC')
    .modify(limitOrOffset(options.limit, options.offset))
    .modify((query: Knex.QueryBuilder) => {
      if (options.trx) {
        query.transacting(options.trx);
      }
    })
    .catch(rethrow);

  return validateEvery<OrderHistoryRow, OrderHistory>(
    ORDER_HISTORY_VIEW_NAME,
    isOrderHistoryRow,
    orderHistoryDataAdapter,
    rows
  );
}
