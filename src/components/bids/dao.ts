import Knex from 'knex';

import db from '../../services/db';
import Bid, {
  BidCreationPayload,
  BidRow,
  BidSortByParam,
  BidWithEvents,
  bidWithEventsDataAdapter,
  BidWithEventsRow,
  BidWithPayoutLogs,
  bidWithPayoutLogsDataAdapter,
  BidWithPayoutLogsRow,
  dataAdapter,
  isBidRow,
  isBidWithEventsRow,
  isBidWithPaymentLogsRow
} from './domain-object';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import limitOrOffset from '../../services/limit-or-offset';
import { MILLISECONDS_TO_EXPIRE } from './constants';
import { omit } from 'lodash';
import * as BidTaskTypesDAO from '../bid-task-types/dao';
import { getBuilder as getTasksViewBuilder } from '../../dao/task-events/view';

// Any payouts to a partner cannot be linked to a bid before this date, as
// they were linked to an invoice. Having a cut-off date allows the API to
// accurately determine if a partner has been paid out completely
export const BID_CUTOFF_DATE = '2019-09-21';

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
    doesNotContain: [
      'REJECT_SERVICE_BID',
      'ACCEPT_SERVICE_BID',
      'REMOVE_PARTNER'
    ]
  },
  OPEN: {
    andAlsoContains: [],
    contains: ['BID_DESIGN'],
    doesNotContain: [
      'REJECT_SERVICE_BID',
      'ACCEPT_SERVICE_BID',
      'REMOVE_PARTNER'
    ]
  },
  REJECTED: {
    andAlsoContains: ['REJECT_SERVICE_BID'],
    contains: ['BID_DESIGN'],
    doesNotContain: ['REMOVE_PARTNER']
  }
};

function filterRemovalEvents(
  targetId: string
): (query: Knex.QueryBuilder) => void {
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

const selectWithAcceptedAt = db.raw(`distinct on (pricing_bids.id) pricing_bids.*,
  CASE WHEN "design_events"."bid_id" IN (
    SELECT
      "design_events"."bid_id"
    FROM
      "design_events"
    WHERE
      "design_events"."type" IN ('ACCEPT_SERVICE_BID'))
    AND "design_events"."bid_id" NOT IN (
      SELECT
        "design_events"."bid_id"
      FROM
        "design_events"
      WHERE
        "design_events"."type" IN ('REMOVE_PARTNER')) THEN
    (SELECT
      "design_events"."created_at"
    FROM
      "design_events"
    WHERE "design_events"."type" IN ('ACCEPT_SERVICE_BID')
      AND "design_events"."bid_id" = "pricing_bids"."id"
      order by "design_events"."created_at" desc limit 1)
  ELSE
    null
  END AS accepted_at, null as completed_at`);

const selectWithAcceptedAtAndCompletedAt = db.raw(
  `distinct on (pricing_bids.id) pricing_bids.*,
  CASE WHEN "design_events"."bid_id" IN (
    SELECT
      "design_events"."bid_id"
    FROM
      "design_events"
    WHERE
      "design_events"."type" IN ('ACCEPT_SERVICE_BID'))
    AND "design_events"."bid_id" NOT IN (
      SELECT
        "design_events"."bid_id"
      FROM
        "design_events"
      WHERE
        "design_events"."type" IN ('REMOVE_PARTNER')) THEN
    (SELECT
      "design_events"."created_at"
    FROM
      "design_events"
    WHERE "design_events"."type" IN ('ACCEPT_SERVICE_BID')
      AND "design_events"."bid_id" = "pricing_bids"."id"
      order by "design_events"."created_at" desc limit 1)
  ELSE
    null
  END AS accepted_at,
  (select max(t.last_modified_at)
  from (:taskView) as t where t.design_id = design_events.design_id) as completed_at`,
  { taskView: getTasksViewBuilder() }
);

const orderBy = (
  orderClause: string,
  query: Knex.QueryBuilder
): Knex.QueryBuilder =>
  db
    .select('*')
    .from({ data: query })
    .orderByRaw(orderClause);

const orderByAcceptedAt = orderBy.bind(
  null,
  'accepted_at desc NULLS LAST, created_at desc'
);

const orderByDueDate = orderBy.bind(
  null,
  'due_date asc NULLS LAST, created_at desc'
);

export function create(bidPayload: BidCreationPayload): Promise<Bid> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const { taskTypeIds, ...bid } = bidPayload;
    const rowData = {
      ...omit(dataAdapter.forInsertion(bid), ['completed_at', 'accepted_at']),
      created_at: new Date()
    };
    const createdBid = await db(TABLE_NAME)
      .insert(rowData)
      .returning('*')
      .transacting(trx)
      .then((rows: BidRow[]) => first(rows));

    const withAcceptedAt = await findById(createdBid.id, trx);

    if (!withAcceptedAt) {
      throw new Error('Failed to create Bid');
    }

    for (const taskTypeId of taskTypeIds) {
      await BidTaskTypesDAO.create(
        {
          pricingBidId: withAcceptedAt.id,
          taskTypeId
        },
        trx
      );
    }

    return omit(withAcceptedAt, ['partnerPayoutLogs', 'partnerUserId']);
  });
}

function findAllByState(
  state: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
): Knex.QueryBuilder {
  const contains = statusToEvents[state].contains;
  const alsoContains = statusToEvents[state].andAlsoContains;
  const doesNotContain = statusToEvents[state].doesNotContain;

  return db(DESIGN_EVENTS_TABLE)
    .select()
    .select(selectWithAcceptedAt)
    .rightJoin('pricing_bids', (join: Knex.JoinClause) => {
      join
        .on('design_events.bid_id', '=', 'pricing_bids.id')
        .andOnIn('design_events.type', contains);
    })
    .modify(
      (query: Knex.QueryBuilder): void => {
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
          query.andWhereRaw(
            `pricing_bids.created_at > (now() - INTERVAL '${MILLISECONDS_TO_EXPIRE} milliseconds')`
          );
        } else if (state === 'EXPIRED') {
          query.andWhereRaw(
            `pricing_bids.created_at < (now() - INTERVAL '${MILLISECONDS_TO_EXPIRE} milliseconds')`
          );
        }
      }
    )
    .groupBy([
      'pricing_bids.id',
      'design_events.bid_id',
      'design_events.created_at'
    ])
    .orderBy('pricing_bids.id')
    .orderBy('pricing_bids.created_at', 'DESC');
}

export async function findAll(modifiers: {
  limit?: number;
  offset?: number;
  state?: string;
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
      query = db(DESIGN_EVENTS_TABLE)
        .select(selectWithAcceptedAt)
        .rightJoin('pricing_bids', (join: Knex.JoinClause) => {
          join.on('design_events.bid_id', '=', 'pricing_bids.id');
        })
        .groupBy([
          'pricing_bids.id',
          'design_events.bid_id',
          'design_events.created_at'
        ])
        .orderBy('pricing_bids.id')
        .orderBy('pricing_bids.created_at', 'desc');
      break;
    }
  }

  const bids: BidRow[] = await orderByAcceptedAt(query).modify(
    limitOrOffset(modifiers.limit, modifiers.offset)
  );

  return validateEvery<BidRow, Bid>(TABLE_NAME, isBidRow, dataAdapter, bids);
}

export async function findUnpaidByUserId(userId: string): Promise<Bid[]> {
  const bids = await db('users')
    .select(selectWithAcceptedAt)
    .from('users')
    .join('design_events', 'users.id', 'design_events.actor_id')
    .join('product_designs as d', 'design_events.design_id', 'd.id')
    .join('collection_designs as c', 'd.id', 'c.design_id')
    .join('pricing_bids', 'design_events.bid_id', 'pricing_bids.id')
    .leftJoin('partner_payout_logs as l', 'pricing_bids.id', 'l.bid_id')
    .where({ 'design_events.type': 'ACCEPT_SERVICE_BID', 'users.id': userId })
    .andWhere('design_events.created_at', '>', new Date(BID_CUTOFF_DATE))
    .whereNotIn(
      'pricing_bids.id',
      db.raw("SELECT bid_id from design_events where type = 'REMOVE_PARTNER'")
    )
    .groupBy([
      'pricing_bids.id',
      'design_events.bid_id',
      'pricing_bids.bid_price_cents'
    ])
    .having(
      db.raw(
        'pricing_bids.bid_price_cents > coalesce(sum(l.payout_amount_cents), 0)'
      )
    );

  return validateEvery<BidRow, Bid>(TABLE_NAME, isBidRow, dataAdapter, bids);
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<BidWithPayoutLogs | null> {
  const bid: BidWithPayoutLogsRow | undefined = await db(DESIGN_EVENTS_TABLE)
    .select(selectWithAcceptedAt)
    .select(
      db.raw(`
        CASE
          WHEN design_events.type = 'BID_DESIGN' THEN
            design_events.target_id
          WHEN design_events.type = 'ACCEPT_SERVICE_BID' OR design_events.type = 'REJECT_SERVICE_BID' THEN
            design_events.actor_id
          ELSE null
        END as partner_user_id
      `)
    )
    .select(
      db.raw(
        `
        (
          SELECT to_json(array_agg(ordered_logs.*))
          FROM (
            SELECT logs.* FROM partner_payout_logs AS logs
            WHERE logs.bid_id = pricing_bids.id
            ORDER BY logs.created_at DESC
          ) AS ordered_logs
        ) AS partner_payout_logs`
      )
    )
    .rightJoin('pricing_bids', (join: Knex.JoinClause) => {
      join.on('design_events.bid_id', '=', 'pricing_bids.id');
    })
    .where({ 'pricing_bids.id': id })
    .groupBy([
      'pricing_bids.id',
      'design_events.bid_id',
      'design_events.created_at',
      'partner_user_id'
    ])
    .orderBy('pricing_bids.id')
    .orderBy('pricing_bids.created_at', 'desc')
    .limit(1)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((bids: BidWithPayoutLogsRow[]) => first(bids));

  if (!bid) {
    return null;
  }

  return validate<BidWithPayoutLogsRow, BidWithPayoutLogs>(
    TABLE_NAME,
    isBidWithPaymentLogsRow,
    bidWithPayoutLogsDataAdapter,
    bid
  );
}

export async function findOpenByTargetId(
  targetId: string,
  sortBy: BidSortByParam
): Promise<Bid[]> {
  let sortingFunction = orderByAcceptedAt;
  switch (sortBy) {
    case 'ACCEPTED':
      sortingFunction = orderByAcceptedAt;
      break;
    case 'DUE':
      sortingFunction = orderByDueDate;
      break;
  }
  const targetRows = await sortingFunction(
    db(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
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
      .groupBy([
        'pricing_bids.id',
        'design_events.bid_id',
        'design_events.created_at'
      ])
  );

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findAcceptedByTargetId(
  targetId: string,
  sortBy: BidSortByParam
): Promise<Bid[]> {
  let sortingFunction = orderByAcceptedAt;
  switch (sortBy) {
    case 'ACCEPTED':
      sortingFunction = orderByAcceptedAt;
      break;
    case 'DUE':
      sortingFunction = orderByDueDate;
      break;
  }
  const targetRows = await sortingFunction(
    db(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .rightJoin('pricing_bids', (join: Knex.JoinClause) => {
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
          .whereIn(
            'design_events.type',
            statusToEvents.ACCEPTED.andAlsoContains
          )
          .andWhere({ 'design_events.actor_id': targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        'pricing_bids.id',
        'design_events.bid_id',
        'design_events.created_at'
      ])
  );

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findActiveByTargetId(
  targetId: string,
  sortBy: BidSortByParam
): Promise<Bid[]> {
  let sortingFunction = orderByAcceptedAt;
  switch (sortBy) {
    case 'ACCEPTED':
      sortingFunction = orderByAcceptedAt;
      break;
    case 'DUE':
      sortingFunction = orderByDueDate;
      break;
  }
  const targetRows = await sortingFunction(
    db(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .rightJoin('pricing_bids', (join: Knex.JoinClause) => {
        join
          .on('design_events.bid_id', '=', 'pricing_bids.id')
          .andOnIn('design_events.target_id', [targetId])
          .andOnIn('design_events.type', statusToEvents.ACCEPTED.contains);
      })
      // The purpose of this is to get the list of designs that are completed and see
      // if this is not one of them. The strategy here is to get all of the tasks by
      // unique designId and status. If there is one status and that status is
      // completed then the design is completed.
      .whereNotIn(
        'design_events.design_id',
        db.raw(
          `
        select
          outerquery.design_id
        from (
          select distinct on (t.design_id, t.status) t.design_id as design_id, t.status as status
          from :taskView as t) as outerquery
        where outerquery.status = 'COMPLETED'
        and outerquery.design_id in (
          select innertasks.design_id from (
            select distinct on (t.design_id, t.status) t.design_id, t.status
            from :taskView as t
          ) as innertasks
          group by innertasks.design_id
          having count(innertasks.design_id) = 1)
        `,
          { taskView: getTasksViewBuilder() }
        )
      )
      .whereIn(
        'design_events.bid_id',
        db
          .select('design_events.bid_id')
          .from('design_events')
          .whereIn(
            'design_events.type',
            statusToEvents.ACCEPTED.andAlsoContains
          )
          .andWhere({ 'design_events.actor_id': targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        'pricing_bids.id',
        'design_events.bid_id',
        'design_events.created_at'
      ])
      .orderBy('pricing_bids.id')
      .orderBy('pricing_bids.created_at', 'asc')
  );

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findCompletedByTargetId(
  targetId: string,
  sortBy: BidSortByParam
): Promise<Bid[]> {
  let sortingFunction = orderByAcceptedAt;
  switch (sortBy) {
    case 'ACCEPTED':
      sortingFunction = orderByAcceptedAt;
      break;
    case 'DUE':
      sortingFunction = orderByDueDate;
      break;
  }
  const targetRows = await sortingFunction(
    db(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAtAndCompletedAt)
      .rightJoin('pricing_bids', (join: Knex.JoinClause) => {
        join
          .on('design_events.bid_id', '=', 'pricing_bids.id')
          .andOnIn('design_events.target_id', [targetId])
          .andOnIn('design_events.type', statusToEvents.ACCEPTED.contains);
      })
      // The purpose of this is to get the list of designs that are completed and see
      // if this is one of them. The strategy here is to get all of the tasks by
      // unique designId and status. If there is one status and that status is
      // completed then the design is completed.
      .whereIn(
        'design_events.design_id',
        db.raw(
          `
        select
          outerquery.design_id
        from (
          select distinct on (t.design_id, t.status) t.design_id as design_id, t.status as status
          from :taskView as t) as outerquery
        where outerquery.status = 'COMPLETED'
        and outerquery.design_id in (
          select innertasks.design_id from (
            select distinct on (t.design_id, t.status) t.design_id, t.status
            from :taskView as t
          ) as innertasks
          group by innertasks.design_id
          having count(innertasks.design_id) = 1)
        `,
          { taskView: getTasksViewBuilder() }
        )
      )
      .whereIn(
        'design_events.bid_id',
        db
          .select('design_events.bid_id')
          .from('design_events')
          .whereIn(
            'design_events.type',
            statusToEvents.ACCEPTED.andAlsoContains
          )
          .andWhere({ 'design_events.actor_id': targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        'pricing_bids.id',
        'design_events.bid_id',
        'design_events.created_at',
        'design_events.design_id'
      ])
      .orderBy('pricing_bids.id')
      .orderBy('pricing_bids.created_at', 'asc')
  );

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findRejectedByTargetId(
  targetId: string,
  sortBy: BidSortByParam
): Promise<Bid[]> {
  let sortingFunction = orderByAcceptedAt;
  switch (sortBy) {
    case 'ACCEPTED':
      sortingFunction = orderByAcceptedAt;
      break;
    case 'DUE':
      sortingFunction = orderByDueDate;
      break;
  }
  const targetRows = await sortingFunction(
    db(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .rightJoin('pricing_bids', (join: Knex.JoinClause) => {
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
          .whereIn(
            'design_events.type',
            statusToEvents.REJECTED.andAlsoContains
          )
          .andWhere({ 'design_events.actor_id': targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        'pricing_bids.id',
        'design_events.bid_id',
        'design_events.created_at'
      ])
  );

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findByQuoteId(quoteId: string): Promise<Bid[]> {
  const bidRows = await orderByAcceptedAt(
    db(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .rightJoin('pricing_bids', (join: Knex.JoinClause) => {
        join.on('design_events.bid_id', '=', 'pricing_bids.id');
      })
      .where({ 'pricing_bids.quote_id': quoteId })
      .groupBy([
        'pricing_bids.id',
        'design_events.bid_id',
        'design_events.created_at'
      ])
      .orderBy('pricing_bids.id')
      .orderBy('pricing_bids.created_at', 'desc')
  );

  return validateEvery<BidRow, Bid>(TABLE_NAME, isBidRow, dataAdapter, bidRows);
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
  const bidWithEventsRows = await orderByAcceptedAt(
    db
      .select(selectWithAcceptedAt)
      .select(
        db.raw(
          `
 (
    SELECT to_json(array_agg(ordered_events.*))
    FROM (
      SELECT events.* FROM design_events AS events
      WHERE events.bid_id = pricing_bids.id
      AND (
        (events.type = 'BID_DESIGN' AND events.target_id = :userId)
        OR (events.type = 'ACCEPT_SERVICE_BID' AND events.actor_id = :userId)
        OR (events.type = 'REJECT_SERVICE_BID' AND events.actor_id = :userId)
        OR (events.type = 'REMOVE_PARTNER' AND events.target_id = :userId)
      )
      ORDER BY events.created_at ASC
    ) AS ordered_events
  ) AS design_events `,
          { userId }
        )
      )
      .from(DESIGN_EVENTS_TABLE)
      .rightJoin('pricing_bids', 'design_events.bid_id', 'pricing_bids.id')
      .leftJoin('pricing_quotes', 'pricing_quotes.id', 'pricing_bids.quote_id')
      .where({ 'pricing_quotes.id': quoteId })
      .groupBy([
        'pricing_bids.id',
        'design_events.bid_id',
        'design_events.created_at'
      ])
      .orderBy('pricing_bids.id')
      .orderBy('pricing_bids.created_at', 'desc')
  );

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
