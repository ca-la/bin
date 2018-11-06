import * as Knex from 'knex';
import * as db from '../../services/db';
import Bid, {
  BidRow,
  dataAdapter,
  isBidRow
} from '../../domain-objects/bid';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'pricing_bids';

export async function create(bid: Bid): Promise<Bid> {
  const rowData = dataAdapter.forInsertion(bid);

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then((rows: BidRow[]) => first(rows));

  if (!created) {
    throw new Error('Failed to create Bid');
  }

  return validate<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    created
  );
}

export async function findOpenByTargetId(targetId: string): Promise<Bid[]> {
  const targetRows = await db('design_events')
    .select('pricing_bids.*')
    .join('pricing_bids', (join: Knex.JoinClause) => {
      join
        .on('design_events.bid_id', '=', 'pricing_bids.id')
        .andOnIn('design_events.target_id', [targetId])
        .andOnIn('design_events.type', ['BID_DESIGN']);
    })
    .whereNotIn(
      'design_events.bid_id',
      db
        .select('design_events.bid_id')
        .from('design_events')
        .whereIn('design_events.type', ['REJECT_SERVICE_BID', 'ACCEPT_SERVICE_BID'])
        .andWhere({ 'design_events.actor_id': targetId })
    )
    .groupBy('pricing_bids.id')
    .orderBy('pricing_bids.created_at', 'asc');

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findAcceptedByTargetId(targetId: string): Promise<Bid[]> {
  const targetRows = await db('design_events')
    .select('pricing_bids.*')
    .join('pricing_bids', (join: Knex.JoinClause) => {
      join
        .on('design_events.bid_id', '=', 'pricing_bids.id')
        .andOnIn('design_events.target_id', [targetId])
        .andOnIn('design_events.type', ['BID_DESIGN']);
    })
    .whereIn(
      'design_events.bid_id',
      db
        .select('design_events.bid_id')
        .from('design_events')
        .whereIn('design_events.type', ['ACCEPT_SERVICE_BID'])
        .andWhere({ 'design_events.actor_id': targetId })
    )
    .groupBy('pricing_bids.id')
    .orderBy('pricing_bids.created_at', 'asc');

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findRejectedByTargetId(targetId: string): Promise<Bid[]> {
  const targetRows = await db('design_events')
    .select('pricing_bids.*')
    .join('pricing_bids', (join: Knex.JoinClause) => {
      join
        .on('design_events.bid_id', '=', 'pricing_bids.id')
        .andOnIn('design_events.target_id', [targetId])
        .andOnIn('design_events.type', ['BID_DESIGN']);
    })
    .whereIn(
      'design_events.bid_id',
      db
        .select('design_events.bid_id')
        .from('design_events')
        .whereIn('design_events.type', ['REJECT_SERVICE_BID'])
        .andWhere({ 'design_events.actor_id': targetId })
    )
    .groupBy('pricing_bids.id')
    .orderBy('pricing_bids.created_at', 'asc');

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findByQuoteId(quoteId: string): Promise<Bid[]> {
  const quoteRows = await db(TABLE_NAME)
    .select('*')
    .orderBy('created_at', 'asc')
    .where({ quote_id: quoteId });

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    quoteRows
  );
}
