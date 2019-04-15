import * as Knex from 'knex';
import * as db from '../../services/db';
import Bid, {
  BidRow,
  BidWithEvents,
  bidWithEventsDataAdapter,
  BidWithEventsRow,
  dataAdapter,
  isBidRow,
  isBidWithEventsRow
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
    doesNotContain: ['REMOVE_PARTNER']
  },
  EXPIRED: {
    andAlsoContains: [],
    contains: ['BID_DESIGN'],
    doesNotContain: ['REJECT_SERVICE_BID', 'ACCEPT_SERVICE_BID', 'REMOVE_PARTNER']
  },
  OPEN: {
    andAlsoContains: [],
    contains: ['BID_DESIGN'],
    doesNotContain: ['REJECT_SERVICE_BID', 'ACCEPT_SERVICE_BID', 'REMOVE_PARTNER']
  },
  REJECTED: {
    andAlsoContains: ['REJECT_SERVICE_BID'],
    contains: ['BID_DESIGN'],
    doesNotContain: ['REMOVE_PARTNER']
  }
};

function filterRemovalEvents(targetId: string): (query: Knex.QueryBuilder) => void {
  return (query: Knex.QueryBuilder): void => {
    query.whereNotIn(
      'design_events.bid_id',
      db
        .select('design_events.bid_id')
        .from('design_events')
        .where('design_events.type', 'REMOVE_PARTNER')
        .andWhere('design_events.target_id', targetId)
    );
  };
}

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
        .andOnIn('design_events.type', statusToEvents.OPEN.contains);
    })
    .whereNotIn(
      'design_events.bid_id',
      db
        .select('design_events.bid_id')
        .from('design_events')
        .whereIn('design_events.type', statusToEvents.OPEN.doesNotContain)
        .andWhere({ 'design_events.actor_id': targetId })
    )
    .modify(filterRemovalEvents(targetId))
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
        .andOnIn('design_events.type', statusToEvents.ACCEPTED.contains);
    })
    .whereIn(
      'design_events.bid_id',
      db
        .select('design_events.bid_id')
        .from('design_events')
        .whereIn('design_events.type', statusToEvents.ACCEPTED.andAlsoContains)
        .andWhere({ 'design_events.actor_id': targetId })
    )
    .modify(filterRemovalEvents(targetId))
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
        .andOnIn('design_events.type', statusToEvents.REJECTED.contains);
    })
    .whereIn(
      'design_events.bid_id',
      db
        .select('design_events.bid_id')
        .from('design_events')
        .whereIn('design_events.type', statusToEvents.REJECTED.andAlsoContains)
        .andWhere({ 'design_events.actor_id': targetId })
    )
    .modify(filterRemovalEvents(targetId))
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
  const bidRows = await db(TABLE_NAME)
    .select('*')
    .orderBy('created_at', 'asc')
    .where({ quote_id: quoteId });

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    bidRows
  );
}

/**
 * Returns all bids with bid-specific design events associated with the quote and user.
 * Returns events of type: BID_DESIGN | ACCEPT_SERVICE_BID | REJECT_SERVICE_BID | REMOVE_PARTNER.
 * @param quoteId
 * @param userId
 */
export async function findAllByQuoteAndUserId(
  quoteId: string,
  userId: string
): Promise<BidWithEvents[]> {
  const { rows: bidWithEventsRows } = await db.raw(`
SELECT bids.*, (
  SELECT to_json(array_agg(ordered_events.*))
  FROM (
    SELECT events.* FROM design_events AS events
    WHERE events.bid_id = bids.id
    AND (
      (events.type = 'BID_DESIGN' AND events.target_id = :userId)
      OR (events.type = 'ACCEPT_SERVICE_BID' AND events.actor_id = :userId)
      OR (events.type = 'REJECT_SERVICE_BID' AND events.actor_id = :userId)
      OR (events.type = 'REMOVE_PARTNER' AND events.target_id = :userId)
    )
    ORDER BY events.created_at ASC
  ) AS ordered_events
) AS design_events
FROM pricing_bids as bids
LEFT JOIN pricing_quotes AS quotes ON quotes.id = bids.quote_id
WHERE quotes.id = :quoteId
ORDER BY bids.created_at DESC;
  `, { quoteId, userId });

  if (!bidWithEventsRows) {
    return [];
  }

  return validateEvery<BidWithEventsRow, BidWithEvents>(
    TABLE_NAME,
    isBidWithEventsRow,
    bidWithEventsDataAdapter,
    bidWithEventsRows
  );
}
