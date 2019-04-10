import * as Knex from 'knex';
import * as db from '../../services/db';
import Bid, {
  BidRow,
  dataAdapter,
  isBidRow
} from './domain-object';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import limitOrOffset from '../../services/limit-or-offset';

const TABLE_NAME = 'pricing_bids';
const DESIGN_EVENTS_TABLE = 'design_events';

const statusToEvents = {
  ACCEPTED: {
    andAlsoContains: ['ACCEPT_SERVICE_BID'],
    contains: ['BID_DESIGN'],
    doesNotContain: []
  },
  EXPIRED: {
    andAlsoContains: [],
    contains: ['BID_DESIGN'],
    doesNotContain: ['REJECT_SERVICE_BID', 'ACCEPT_SERVICE_BID']
  },
  OPEN: {
    andAlsoContains: [],
    contains: ['BID_DESIGN'],
    doesNotContain: ['REJECT_SERVICE_BID', 'ACCEPT_SERVICE_BID']
  },
  REJECTED: {
    andAlsoContains: ['REJECT_SERVICE_BID'],
    contains: ['BID_DESIGN'],
    doesNotContain: []
  }
};

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

function findAllByState(state: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'): Knex.QueryBuilder {
  const contains = statusToEvents[state].contains;
  const alsoContains = statusToEvents[state].andAlsoContains;
  const doesNotContain = statusToEvents[state].doesNotContain;

  return db(DESIGN_EVENTS_TABLE)
    .select('pricing_bids.*')
    .join('pricing_bids', (join: Knex.JoinClause) => {
      join
        .on('design_events.bid_id', '=', 'pricing_bids.id')
        .andOnIn('design_events.type', contains);
    })
    .modify((query: Knex.QueryBuilder): void => {
      if (alsoContains.length > 0) {
        query.whereIn(
          'design_events.bid_id',
          db
            .select('design_events.bid_id')
            .from('design_events')
            .whereIn('design_events.type', alsoContains)
        );
      }

      if (doesNotContain.length > 0) {
        query.whereNotIn(
          'design_events.bid_id',
          db
            .select('design_events.bid_id')
            .from('design_events')
            .whereIn('design_events.type', doesNotContain)
        );
      }

      if (state === 'OPEN') {
        query.andWhereRaw('pricing_bids.created_at > (now() - INTERVAL \'1 Day\')');
      } else if (state === 'EXPIRED') {
        query.andWhereRaw('pricing_bids.created_at < (now() - INTERVAL \'1 Day\')');
      }
    })
    .groupBy('pricing_bids.id')
    .orderBy('pricing_bids.created_at', 'DESC');
}

export async function findAll(modifiers: {
  limit?: number,
  offset?: number,
  state?: string
}): Promise<Bid[]> {
  let query: Knex.QueryBuilder;

  switch (modifiers.state) {
    case 'OPEN':
    case 'ACCEPTED':
    case 'REJECTED':
    case 'EXPIRED': {
      query = findAllByState(modifiers.state);
      break;
    }

    default: {
      query = db(TABLE_NAME)
        .select('*')
        .orderBy('created_at', 'DESC');
      break;
    }
  }

  const bids: BidRow[] = await query.modify(limitOrOffset(modifiers.limit, modifiers.offset));

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    bids
  );
}

export async function findById(id: string): Promise<Bid | null> {
  const bid: BidRow | undefined = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .then((bids: BidRow[]) => first(bids));

  if (!bid) {
    return null;
  }

  return validate<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    bid
  );
}

export async function findOpenByTargetId(targetId: string): Promise<Bid[]> {
  const targetRows = await db(DESIGN_EVENTS_TABLE)
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
  const targetRows = await db(DESIGN_EVENTS_TABLE)
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
  const targetRows = await db(DESIGN_EVENTS_TABLE)
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
