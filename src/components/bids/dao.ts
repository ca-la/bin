import Knex from "knex";

import db from "../../services/db";
import { Bid, BidDb, BidSortByParam, BidWithEvents } from "./types";
import { rawAdapter, dataAdapter, withEventsDataAdapter } from "./adapter";
import limitOrOffset from "../../services/limit-or-offset";
import { MILLISECONDS_TO_EXPIRE } from "./constants";
import {
  PARTNER_TEAM_BID_PREVIEWERS,
  Role as TeamUserRole,
} from "../team-users/types";

// Any payouts to a partner cannot be linked to a bid before this date, as
// they were linked to an invoice. Having a cut-off date allows the API to
// accurately determine if a partner has been paid out completely
export const BID_CUTOFF_DATE = "2019-09-21";

const TABLE_NAME = "pricing_bids";
const DESIGN_EVENTS_TABLE = "design_events";

interface StatusEvent {
  andAlsoContains: string[];
  doesNotContain: string[];
}

const statusToEvents: Record<string, StatusEvent> = {
  ACCEPTED: {
    andAlsoContains: ["ACCEPT_SERVICE_BID"],
    doesNotContain: ["REMOVE_PARTNER"],
  },
  EXPIRED: {
    andAlsoContains: [],
    doesNotContain: [
      "REJECT_SERVICE_BID",
      "ACCEPT_SERVICE_BID",
      "REMOVE_PARTNER",
    ],
  },
  OPEN: {
    andAlsoContains: [],
    doesNotContain: [
      "REJECT_SERVICE_BID",
      "ACCEPT_SERVICE_BID",
      "REMOVE_PARTNER",
    ],
  },
  REJECTED: {
    andAlsoContains: ["REJECT_SERVICE_BID"],
    doesNotContain: ["REMOVE_PARTNER"],
  },
};

const selectWithAcceptedAt = db.raw(`
pricing_bids.*,
(
  SELECT design_events.created_at
    FROM design_events
   WHERE design_events.bid_id = pricing_bids.id
     AND design_events.type = 'ACCEPT_SERVICE_BID'
     AND design_events.bid_id NOT IN (
        SELECT design_events.bid_id
          FROM design_events
         WHERE design_events.type = 'REMOVE_PARTNER'
     )
   ORDER BY design_events.created_at DESC
   LIMIT 1
) AS accepted_at
`);

const baseQuery = (ktx: Knex) =>
  ktx(TABLE_NAME)
    .select(selectWithAcceptedAt)
    .groupBy(["pricing_bids.id"])
    .orderBy("pricing_bids.created_at", "DESC");

const assigneeSubquery = (
  statusEvent: StatusEvent,
  subquery: Knex.QueryBuilder
) =>
  subquery
    .select([
      "team_users.user_id as team_user_id",
      "team_users.role as team_user_role",
      "design_events.bid_id",
      "design_events.target_id",
      "design_events.target_team_id",
    ])
    .from("design_events")
    .leftJoin(
      "team_users",
      "team_users.team_id",
      "design_events.target_team_id"
    )
    .where({
      "design_events.type": "BID_DESIGN",
      "team_users.deleted_at": null,
    })
    .modify((q: Knex.QueryBuilder): void => {
      if (statusEvent.andAlsoContains.length > 0) {
        q.whereIn(
          "design_events.bid_id",
          db
            .select("design_events.bid_id")
            .from("design_events")
            .whereIn("design_events.type", statusEvent.andAlsoContains)
        );
      }

      if (statusEvent.doesNotContain.length > 0) {
        q.whereNotIn(
          "design_events.bid_id",
          db
            .select("design_events.bid_id")
            .from("design_events")
            .whereIn("design_events.type", statusEvent.doesNotContain)
        );
      }
    })
    .as("bid_event");

const removeUnassigned = (statusEvent: StatusEvent, query: Knex.QueryBuilder) =>
  query.join(
    assigneeSubquery.bind(null, statusEvent),
    "bid_event.bid_id",
    "pricing_bids.id"
  );

const forUserQuery = (
  userId: string,
  allowedTeamRoles: TeamUserRole[] = Object.values(TeamUserRole)
) => (query: Knex.QueryBuilder) =>
  query.whereRaw(
    `
        CASE
          WHEN bid_event.team_user_id IS NOT NULL
               THEN bid_event.team_user_id = ? AND bid_event.team_user_role IN (
                      ${allowedTeamRoles.map(() => "?").join(",")}
                    )
          ELSE bid_event.target_id = ?
        END`,
    [userId, ...allowedTeamRoles, userId]
  );

const orderByAcceptedAt = (query: Knex.QueryBuilder) =>
  query.orderByRaw("accepted_at desc NULLS LAST, created_at desc");

const orderByDueDate = (query: Knex.QueryBuilder) =>
  query.orderByRaw("due_date asc NULLS LAST, created_at desc");

export async function create(trx: Knex.Transaction, bid: BidDb): Promise<Bid> {
  const rowData = rawAdapter.forInsertion(bid);
  await trx(TABLE_NAME).insert(rowData).transacting(trx);

  const withAcceptedAt = await findById(trx, bid.id);

  if (!withAcceptedAt) {
    throw new Error("Failed to create Bid");
  }

  return withAcceptedAt;
}

function findAllByState(
  trx: Knex.Transaction,
  state: "OPEN" | "ACCEPTED" | "REJECTED" | "EXPIRED"
): Knex.QueryBuilder {
  const statusEvent = statusToEvents[state];

  return baseQuery(trx)
    .modify(removeUnassigned.bind(null, statusEvent))
    .modify((query: Knex.QueryBuilder) => {
      if (state === "OPEN") {
        query.andWhereRaw(
          `pricing_bids.created_at > (now() - INTERVAL '${MILLISECONDS_TO_EXPIRE} milliseconds')`
        );
      } else if (state === "EXPIRED") {
        query.andWhereRaw(
          `pricing_bids.created_at < (now() - INTERVAL '${MILLISECONDS_TO_EXPIRE} milliseconds')`
        );
      }
    })
    .orderBy("accepted_at", "desc");
}

export async function findAll(
  trx: Knex.Transaction,
  modifiers: {
    limit?: number;
    offset?: number;
    state?: string;
  }
): Promise<Bid[]> {
  let query: Knex.QueryBuilder;

  switch (modifiers.state) {
    case "OPEN":
    case "ACCEPTED":
    case "REJECTED":
    case "EXPIRED": {
      query = findAllByState(trx, modifiers.state);
      break;
    }

    default: {
      query = baseQuery(trx);
      break;
    }
  }

  const bids = await query
    .modify(limitOrOffset(modifiers.limit, modifiers.offset))
    .modify(withAssignee);

  return dataAdapter.fromDbArray(bids);
}

export async function findUnpaidByUserId(
  ktx: Knex,
  userId: string
): Promise<Bid[]> {
  const bids = await ktx("users")
    .select(selectWithAcceptedAt)
    .join("design_events", "users.id", "design_events.actor_id")
    .join("product_designs as d", "design_events.design_id", "d.id")
    .join("collection_designs as c", "d.id", "c.design_id")
    .join("pricing_bids", "design_events.bid_id", "pricing_bids.id")
    .leftJoin("partner_payout_logs as l", "pricing_bids.id", "l.bid_id")
    .where({ "design_events.type": "ACCEPT_SERVICE_BID", "users.id": userId })
    .andWhere("design_events.created_at", ">", new Date(BID_CUTOFF_DATE))
    .whereNotIn("pricing_bids.id", (subquery: Knex.QueryBuilder) =>
      subquery
        .from("design_events")
        .select("bid_id")
        .where({ type: "REMOVE_PARTNER" })
    )
    .groupBy(["pricing_bids.id", "design_events.bid_id"])
    .having(
      ktx.raw(
        "pricing_bids.bid_price_cents > coalesce(sum(l.payout_amount_cents), 0)"
      )
    )
    .modify(withAssignee)
    .orderBy("pricing_bids.id")
    .orderBy("pricing_bids.created_at", "desc");

  return dataAdapter.fromDbArray(bids);
}

export async function findUnpaidByTeamId(
  ktx: Knex,
  teamId: string
): Promise<Bid[]> {
  const bids = await ktx("teams")
    .select(selectWithAcceptedAt)
    .join("design_events", "teams.id", "design_events.target_team_id")
    .join("product_designs as d", "design_events.design_id", "d.id")
    .join("collection_designs as c", "d.id", "c.design_id")
    .join("pricing_bids", "design_events.bid_id", "pricing_bids.id")
    .leftJoin("partner_payout_logs as l", "pricing_bids.id", "l.bid_id")
    .where({
      "design_events.type": "ACCEPT_SERVICE_BID",
      "design_events.target_team_id": teamId,
    })
    .whereNotIn(
      "pricing_bids.id",
      ktx
        .select("bid_id")
        .from("design_events")
        .where({ type: "REMOVE_PARTNER" })
    )
    .groupBy(["pricing_bids.id", "design_events.bid_id"])
    .having(
      ktx.raw(
        "pricing_bids.bid_price_cents > coalesce(sum(l.payout_amount_cents), 0)"
      )
    )
    .modify(withAssignee)
    .orderBy("pricing_bids.id")
    .orderBy("pricing_bids.created_at", "desc");

  return dataAdapter.fromDbArray(bids);
}

function withAssignee(query: Knex.QueryBuilder) {
  return query.select((subquery: Knex.QueryBuilder) =>
    subquery
      .select(
        db.raw(`
          CASE
            WHEN users.id IS NOT NULL THEN
              json_build_object(
                'type', 'USER',
                'id', users.id,
                'name', COALESCE(users.name, users.email)
              )
            WHEN teams.id IS NOT NULL THEN
              json_build_object(
                'type', 'TEAM',
                'id', teams.id,
                'name', teams.title
              )
            ELSE NULL
          END AS assignee
        `)
      )
      .from(
        assigneeSubquery.bind(null, {
          andAlsoContains: [],
          doesNotContain: ["REMOVE_PARTNER"],
        })
      )
      .leftJoin("users", "users.id", "bid_event.target_id")
      .leftJoin("teams", "teams.id", "bid_event.target_team_id")
      .whereRaw("bid_event.bid_id = pricing_bids.id")
      .limit(1)
  );
}

function bidById(ktx: Knex, id: string) {
  return baseQuery(ktx)
    .modify(withAssignee)
    .where({ "pricing_bids.id": id })
    .orderBy("pricing_bids.created_at", "desc")
    .first();
}

export async function findById(ktx: Knex, id: string): Promise<Bid | null> {
  const bid = await bidById(ktx, id);

  if (!bid) {
    return null;
  }

  return dataAdapter.fromDb(bid);
}

export async function findByBidIdAndUser(
  ktx: Knex,
  bidId: string,
  userId: string
): Promise<Bid | null> {
  const query = bidById(ktx, bidId)
    .modify(
      removeUnassigned.bind(null, {
        andAlsoContains: [],
        doesNotContain: ["REMOVE_PARTNER"],
      })
    )
    .modify(forUserQuery(userId));
  const bid = await query;

  if (!bid) {
    return null;
  }

  return dataAdapter.fromDb(bid);
}

export async function findOpenByTargetId(
  trx: Knex.Transaction,
  userId: string,
  sortBy: BidSortByParam
): Promise<Bid[]> {
  let sortingFunction = orderByAcceptedAt;
  switch (sortBy) {
    case "ACCEPTED":
      sortingFunction = orderByAcceptedAt;
      break;
    case "DUE":
      sortingFunction = orderByDueDate;
      break;
  }
  const targetRows = await baseQuery(trx)
    .modify(removeUnassigned.bind(null, statusToEvents.OPEN))
    .modify(forUserQuery(userId, PARTNER_TEAM_BID_PREVIEWERS))
    .modify(withAssignee)
    .modify(sortingFunction);

  return dataAdapter.fromDbArray(targetRows);
}

export async function findAcceptedByTargetId(
  trx: Knex.Transaction,
  targetId: string,
  sortBy: BidSortByParam
): Promise<Bid[]> {
  let sortingFunction = orderByAcceptedAt;
  switch (sortBy) {
    case "ACCEPTED":
      sortingFunction = orderByAcceptedAt;
      break;
    case "DUE":
      sortingFunction = orderByDueDate;
      break;
  }
  const targetRows = await baseQuery(trx)
    .modify(removeUnassigned.bind(null, statusToEvents.ACCEPTED))
    .modify(forUserQuery(targetId))
    .modify(withAssignee)
    .modify(sortingFunction);

  return dataAdapter.fromDbArray(targetRows);
}

export async function findRejectedByTargetId(
  trx: Knex.Transaction,
  targetId: string,
  sortBy: BidSortByParam
): Promise<Bid[]> {
  let sortingFunction = orderByAcceptedAt;
  switch (sortBy) {
    case "ACCEPTED":
      sortingFunction = orderByAcceptedAt;
      break;
    case "DUE":
      sortingFunction = orderByDueDate;
      break;
  }
  const targetRows = await baseQuery(trx)
    .modify(removeUnassigned.bind(null, statusToEvents.REJECTED))
    .modify(forUserQuery(targetId))
    .modify(withAssignee)
    .modify(sortingFunction);

  return dataAdapter.fromDbArray(targetRows);
}

export async function findByQuoteId(
  ktx: Knex,
  quoteId: string
): Promise<Bid[]> {
  const bidRows = await baseQuery(ktx)
    .where({ "pricing_bids.quote_id": quoteId })
    .modify(withAssignee)
    .modify(orderByAcceptedAt);

  return dataAdapter.fromDbArray(bidRows);
}

/**
 * Returns all bids with bid-specific design events associated with the quote and user.
 * Returns events of type: BID_DESIGN | ACCEPT_SERVICE_BID | REJECT_SERVICE_BID | REMOVE_PARTNER.
 * @param trx
 * @param quoteId
 * @param targetId User or Team Id
 */
export async function findAllByQuoteAndTargetId(
  trx: Knex.Transaction,
  quoteId: string,
  targetId: string
): Promise<BidWithEvents[]> {
  const bidWithEventsRows = await trx(TABLE_NAME)
    .select(selectWithAcceptedAt)
    .select(
      db.raw(
        `to_json(array_remove(array_agg(
           target_design_events.* ORDER BY target_design_events.created_at ASC
         ), NULL)) as design_events`
      )
    )
    .leftJoin(
      (subquery: Knex.QueryBuilder) =>
        subquery
          .select()
          .from(DESIGN_EVENTS_TABLE)
          .whereRaw(
            db.raw(
              `
      CASE
        WHEN design_events.type = 'BID_DESIGN'
          THEN design_events.target_id = :targetId
            OR design_events.target_team_id = :targetId
        WHEN design_events.type = 'ACCEPT_SERVICE_BID'
          THEN design_events.actor_id = :targetId
            OR design_events.target_team_id = :targetId
        WHEN design_events.type = 'REJECT_SERVICE_BID'
          THEN design_events.actor_id = :targetId
            OR design_events.target_team_id = :targetId
        WHEN design_events.type = 'REMOVE_PARTNER'
          THEN design_events.target_id = :targetId
            OR design_events.target_team_id = :targetId
      END
`,
              { targetId }
            )
          )
          .as("target_design_events"),
      "target_design_events.bid_id",
      "pricing_bids.id"
    )
    .leftJoin("pricing_quotes", "pricing_quotes.id", "pricing_bids.quote_id")
    .where({ "pricing_quotes.id": quoteId })
    .groupBy(["pricing_bids.id"])
    .modify(withAssignee)
    .modify(orderByAcceptedAt);

  if (!bidWithEventsRows) {
    return [];
  }

  return withEventsDataAdapter.fromDbArray(bidWithEventsRows);
}
