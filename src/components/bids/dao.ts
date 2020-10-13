import Knex from "knex";
import { omit } from "lodash";

import db from "../../services/db";
import Bid, {
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
  isBidWithPaymentLogsRow,
  bidDbAdapter,
} from "./domain-object";
import { validate, validateEvery } from "../../services/validate-from-db";
import limitOrOffset from "../../services/limit-or-offset";
import { MILLISECONDS_TO_EXPIRE } from "./constants";
import { getMinimal as getMinimalTaskViewBuilder } from "../../dao/task-events/view";
import { BidDb } from "./types";
import { Role as TeamUserRole } from "../team-users/types";

// Any payouts to a partner cannot be linked to a bid before this date, as
// they were linked to an invoice. Having a cut-off date allows the API to
// accurately determine if a partner has been paid out completely
export const BID_CUTOFF_DATE = "2019-09-21";

const TABLE_NAME = "pricing_bids";
const DESIGN_EVENTS_TABLE = "design_events";

const statusToEvents = {
  ACCEPTED: {
    andAlsoContains: ["ACCEPT_SERVICE_BID"],
    contains: ["BID_DESIGN"],
    doesNotContain: ["REMOVE_PARTNER"],
  },
  EXPIRED: {
    andAlsoContains: [],
    contains: ["BID_DESIGN"],
    doesNotContain: [
      "REJECT_SERVICE_BID",
      "ACCEPT_SERVICE_BID",
      "REMOVE_PARTNER",
    ],
  },
  OPEN: {
    andAlsoContains: [],
    contains: ["BID_DESIGN"],
    doesNotContain: [
      "REJECT_SERVICE_BID",
      "ACCEPT_SERVICE_BID",
      "REMOVE_PARTNER",
    ],
  },
  REJECTED: {
    andAlsoContains: ["REJECT_SERVICE_BID"],
    contains: ["BID_DESIGN"],
    doesNotContain: ["REMOVE_PARTNER"],
  },
};

function filterRemovalEvents(
  targetId: string
): (query: Knex.QueryBuilder) => void {
  return (query: Knex.QueryBuilder): void => {
    query.whereNotIn(
      "design_events.bid_id",
      db
        .select("design_events.bid_id")
        .from("design_events")
        .where("design_events.type", "REMOVE_PARTNER")
        .andWhere("design_events.target_id", targetId)
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
  (SELECT MAX(last_modified_at) FROM :taskView AS t where t.design_id = design_events.design_id) AS completed_at`,
  { taskView: getMinimalTaskViewBuilder() }
);

const orderBy = (
  orderClause: string,
  trx: Knex.Transaction,
  query: Knex.QueryBuilder
): Knex.QueryBuilder =>
  db.select("*").from({ data: query }).transacting(trx).orderByRaw(orderClause);

const orderByAcceptedAt = orderBy.bind(
  null,
  "accepted_at desc NULLS LAST, created_at desc"
);

const orderByDueDate = orderBy.bind(
  null,
  "due_date asc NULLS LAST, created_at desc"
);

export async function create(trx: Knex.Transaction, bid: BidDb): Promise<Bid> {
  const rowData = bidDbAdapter.forInsertion(bid);
  await trx(TABLE_NAME).insert(rowData).transacting(trx);

  const withAcceptedAt = await findById(trx, bid.id);

  if (!withAcceptedAt) {
    throw new Error("Failed to create Bid");
  }

  return omit(withAcceptedAt, [
    "partnerPayoutLogs",
    "partnerUserId",
    "assignee",
  ]);
}

function findAllByState(
  trx: Knex.Transaction,
  state: "OPEN" | "ACCEPTED" | "REJECTED" | "EXPIRED"
): Knex.QueryBuilder {
  const contains = statusToEvents[state].contains;
  const alsoContains = statusToEvents[state].andAlsoContains;
  const doesNotContain = statusToEvents[state].doesNotContain;

  return trx(DESIGN_EVENTS_TABLE)
    .select()
    .select(selectWithAcceptedAt)
    .rightJoin("pricing_bids", (join: Knex.JoinClause) => {
      join
        .on("design_events.bid_id", "=", "pricing_bids.id")
        .andOnIn("design_events.type", contains);
    })
    .modify((query: Knex.QueryBuilder): void => {
      if (alsoContains.length > 0) {
        query.whereIn(
          "design_events.bid_id",
          db
            .select("design_events.bid_id")
            .from("design_events")
            .whereIn("design_events.type", alsoContains)
        );
      }

      if (doesNotContain.length > 0) {
        query.whereNotIn(
          "design_events.bid_id",
          db
            .select("design_events.bid_id")
            .from("design_events")
            .whereIn("design_events.type", doesNotContain)
        );
      }

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
    .groupBy([
      "pricing_bids.id",
      "design_events.bid_id",
      "design_events.created_at",
    ])
    .orderBy("pricing_bids.id")
    .orderBy("pricing_bids.created_at", "desc");
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
      query = trx(DESIGN_EVENTS_TABLE)
        .select(selectWithAcceptedAt)
        .rightJoin("pricing_bids", (join: Knex.JoinClause) => {
          join.on("design_events.bid_id", "=", "pricing_bids.id");
        })
        .groupBy([
          "pricing_bids.id",
          "design_events.bid_id",
          "design_events.created_at",
        ])
        .orderBy("pricing_bids.id")
        .orderBy("pricing_bids.created_at", "desc");
      break;
    }
  }

  const bids: BidRow[] = await orderByAcceptedAt(trx, query).modify(
    limitOrOffset(modifiers.limit, modifiers.offset)
  );

  return validateEvery<BidRow, Bid>(TABLE_NAME, isBidRow, dataAdapter, bids);
}

export async function findUnpaidByUserId(
  trx: Knex.Transaction,
  userId: string
): Promise<Bid[]> {
  const bids = await trx("users")
    .select(selectWithAcceptedAt)
    .from("users")
    .join("design_events", "users.id", "design_events.actor_id")
    .join("product_designs as d", "design_events.design_id", "d.id")
    .join("collection_designs as c", "d.id", "c.design_id")
    .join("pricing_bids", "design_events.bid_id", "pricing_bids.id")
    .leftJoin("partner_payout_logs as l", "pricing_bids.id", "l.bid_id")
    .where({ "design_events.type": "ACCEPT_SERVICE_BID", "users.id": userId })
    .andWhere("design_events.created_at", ">", new Date(BID_CUTOFF_DATE))
    .whereNotIn(
      "pricing_bids.id",
      db.raw("SELECT bid_id from design_events where type = 'REMOVE_PARTNER'")
    )
    .groupBy([
      "pricing_bids.id",
      "design_events.bid_id",
      "pricing_bids.bid_price_cents",
    ])
    .having(
      db.raw(
        "pricing_bids.bid_price_cents > coalesce(sum(l.payout_amount_cents), 0)"
      )
    );

  return validateEvery<BidRow, Bid>(TABLE_NAME, isBidRow, dataAdapter, bids);
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
      .from(DESIGN_EVENTS_TABLE)
      .leftJoin("users", "users.id", "design_events.target_id")
      .leftJoin("teams", "teams.id", "design_events.target_team_id")
      .leftJoin("design_events as de2", (join: Knex.JoinClause) =>
        join
          .on("de2.bid_id", "=", "design_events.bid_id")
          .andOn("de2.type", db.raw("?", ["REMOVE_PARTNER"]))
      )
      .where({ "design_events.type": "BID_DESIGN", "de2.id": null })
      .andWhereRaw("design_events.bid_id = pricing_bids.id")
      .orderBy("design_events.created_at", "DESC")
      .limit(1)
  );
}

function bidWithPayoutLogsById(id: string) {
  return db(DESIGN_EVENTS_TABLE)
    .select(selectWithAcceptedAt)
    .modify(withAssignee)
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
    .rightJoin("pricing_bids", (join: Knex.JoinClause) => {
      join.on("design_events.bid_id", "=", "pricing_bids.id");
    })
    .where({ "pricing_bids.id": id })
    .groupBy([
      "pricing_bids.id",
      "design_events.bid_id",
      "design_events.created_at",
      "partner_user_id",
    ])
    .orderBy("pricing_bids.id")
    .orderBy("pricing_bids.created_at", "desc")
    .limit(1);
}

export async function findById(
  trx: Knex.Transaction,
  id: string
): Promise<BidWithPayoutLogs | null> {
  const bid: BidWithPayoutLogsRow | undefined = await bidWithPayoutLogsById(id)
    .transacting(trx)
    .first();

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

export async function findByBidIdAndUser(
  trx: Knex.Transaction,
  bidId: string,
  userId: string
): Promise<BidWithPayoutLogs | null> {
  const bid: BidWithPayoutLogsRow | undefined = await bidWithPayoutLogsById(
    bidId
  )
    .leftJoin("teams", "teams.id", "design_events.target_team_id")
    .leftJoin("team_users", "team_users.team_id", "teams.id")
    .whereRaw(
      `CASE
        WHEN teams.id IS NOT NULL then team_users.user_id = ?
        ELSE design_events.actor_id = ?
      END`,
      [userId, userId]
    )
    .modify((query: Knex.QueryBuilder) => query.transacting(trx))
    .first();

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
  const targetRows = await sortingFunction(
    trx,
    trx(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .leftJoin(
        db.raw("team_users on team_users.user_id = ? AND team_users.role = ?", [
          targetId,
          TeamUserRole.ADMIN,
        ])
      )
      .join(
        db.raw(
          `
          pricing_bids ON
            design_events.bid_id = pricing_bids.id AND
            (
              design_events.target_id = ? OR
              team_users.team_id = design_events.target_team_id
            ) AND
            design_events.type IN (?)
      `,
          [targetId, statusToEvents.OPEN.contains.join(",")]
        )
      )
      .whereNotIn(
        "design_events.bid_id",
        db
          .select("design_events.bid_id")
          .from("design_events")
          .whereIn("design_events.type", statusToEvents.OPEN.doesNotContain)
          .andWhere({ "design_events.actor_id": targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        "pricing_bids.id",
        "design_events.bid_id",
        "design_events.created_at",
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
  const targetRows = await sortingFunction(
    trx,
    trx(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .rightJoin("pricing_bids", (join: Knex.JoinClause) => {
        join
          .on("design_events.bid_id", "=", "pricing_bids.id")
          .andOnIn("design_events.target_id", [targetId])
          .andOnIn("design_events.type", statusToEvents.ACCEPTED.contains);
      })
      .whereIn(
        "design_events.bid_id",
        db
          .select("design_events.bid_id")
          .from("design_events")
          .whereIn(
            "design_events.type",
            statusToEvents.ACCEPTED.andAlsoContains
          )
          .andWhere({ "design_events.actor_id": targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        "pricing_bids.id",
        "design_events.bid_id",
        "design_events.created_at",
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
  const targetRows = await sortingFunction(
    trx,
    trx(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .rightJoin("pricing_bids", (join: Knex.JoinClause) => {
        join
          .on("design_events.bid_id", "=", "pricing_bids.id")
          .andOnIn("design_events.target_id", [targetId])
          .andOnIn("design_events.type", statusToEvents.ACCEPTED.contains);
      })
      // The purpose of this is to get the list of designs that are completed and see
      // if this is not one of them. The strategy here is to get all of the tasks by
      // unique designId and status. If there is one status and that status is
      // completed then the design is completed.
      .whereNotIn(
        "design_events.design_id",
        db.raw(
          `
        select
          outerquery.design_id
        from (
          select distinct on (t.design_id, t.status)
            t.design_id as design_id,
            t.status as status
          from :taskView as t
        ) as outerquery
        where outerquery.status = 'COMPLETED'
        and outerquery.design_id in (
          select innertasks.design_id from (
            select distinct on (t.design_id, t.status) t.design_id, t.status
            from :taskView as t
          ) as innertasks
          group by innertasks.design_id
          having count(innertasks.design_id) = 1)
        `,
          { taskView: getMinimalTaskViewBuilder() }
        )
      )
      .whereIn(
        "design_events.bid_id",
        db
          .select("design_events.bid_id")
          .from("design_events")
          .whereIn(
            "design_events.type",
            statusToEvents.ACCEPTED.andAlsoContains
          )
          .andWhere({ "design_events.actor_id": targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        "pricing_bids.id",
        "design_events.bid_id",
        "design_events.created_at",
      ])
      .orderBy("pricing_bids.id")
      .orderBy("pricing_bids.created_at", "desc")
  );

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findCompletedByTargetId(
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
  const targetRows = await sortingFunction(
    trx,
    trx(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAtAndCompletedAt)
      .rightJoin("pricing_bids", (join: Knex.JoinClause) => {
        join
          .on("design_events.bid_id", "=", "pricing_bids.id")
          .andOnIn("design_events.target_id", [targetId])
          .andOnIn("design_events.type", statusToEvents.ACCEPTED.contains);
      })
      // The purpose of this is to get the list of designs that are completed and see
      // if this is one of them. The strategy here is to get all of the tasks by
      // unique designId and status. If there is one status and that status is
      // completed then the design is completed.
      .whereIn(
        "design_events.design_id",
        db.raw(
          `
        select
          outerquery.design_id
        from (
          select distinct on (t.design_id, t.status)
            t.design_id as design_id,
            t.status as status
          from :taskView as t
        ) as outerquery
        where outerquery.status = 'COMPLETED'
        and outerquery.design_id in (
          select innertasks.design_id from (
            select distinct on (t.design_id, t.status) t.design_id, t.status
            from :taskView as t
          ) as innertasks
          group by innertasks.design_id
          having count(innertasks.design_id) = 1)
`,
          {
            taskView: getMinimalTaskViewBuilder(),
          }
        )
      )
      .whereIn(
        "design_events.bid_id",
        db
          .select("design_events.bid_id")
          .from("design_events")
          .whereIn(
            "design_events.type",
            statusToEvents.ACCEPTED.andAlsoContains
          )
          .andWhere({ "design_events.actor_id": targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        "pricing_bids.id",
        "design_events.bid_id",
        "design_events.created_at",
        "design_events.design_id",
      ])
      .orderBy("pricing_bids.id")
      .orderBy("pricing_bids.created_at", "desc")
  );

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
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
  const targetRows = await sortingFunction(
    trx,
    trx(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .rightJoin("pricing_bids", (join: Knex.JoinClause) => {
        join
          .on("design_events.bid_id", "=", "pricing_bids.id")
          .andOnIn("design_events.target_id", [targetId])
          .andOnIn("design_events.type", statusToEvents.REJECTED.contains);
      })
      .whereIn(
        "design_events.bid_id",
        db
          .select("design_events.bid_id")
          .from("design_events")
          .whereIn(
            "design_events.type",
            statusToEvents.REJECTED.andAlsoContains
          )
          .andWhere({ "design_events.actor_id": targetId })
      )
      .modify(filterRemovalEvents(targetId))
      .groupBy([
        "pricing_bids.id",
        "design_events.bid_id",
        "design_events.created_at",
      ])
  );

  return validateEvery<BidRow, Bid>(
    TABLE_NAME,
    isBidRow,
    dataAdapter,
    targetRows
  );
}

export async function findByQuoteId(
  trx: Knex.Transaction,
  quoteId: string
): Promise<Bid[]> {
  const bidRows = await orderByAcceptedAt(
    trx,
    trx(DESIGN_EVENTS_TABLE)
      .select(selectWithAcceptedAt)
      .rightJoin("pricing_bids", (join: Knex.JoinClause) => {
        join.on("design_events.bid_id", "=", "pricing_bids.id");
      })
      .where({ "pricing_bids.quote_id": quoteId })
      .groupBy([
        "pricing_bids.id",
        "design_events.bid_id",
        "design_events.created_at",
      ])
      .orderBy("pricing_bids.id")
      .orderBy("pricing_bids.created_at", "desc")
  );

  return validateEvery<BidRow, Bid>(TABLE_NAME, isBidRow, dataAdapter, bidRows);
}

/**
 * Returns all bids with bid-specific design events associated with the quote and user.
 * Returns events of type: BID_DESIGN | ACCEPT_SERVICE_BID | REJECT_SERVICE_BID | REMOVE_PARTNER.
 * @param quoteId
 * @param targetId User or Team Id
 */
export async function findAllByQuoteAndTargetId(
  trx: Knex.Transaction,
  quoteId: string,
  targetId: string
): Promise<BidWithEvents[]> {
  const bidWithEventsRows = await orderByAcceptedAt(
    trx,
    trx(DESIGN_EVENTS_TABLE)
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
        CASE
          WHEN events.type = 'BID_DESIGN'
            THEN events.target_id = :targetId OR events.target_team_id = :targetId
          WHEN events.type = 'ACCEPT_SERVICE_BID'
            THEN events.actor_id = :targetId OR events.target_team_id = :targetId
          WHEN events.type = 'REJECT_SERVICE_BID'
            THEN events.actor_id = :targetId OR events.target_team_id = :targetId
          WHEN events.type = 'REMOVE_PARTNER'
            THEN events.target_id = :targetId OR events.target_team_id = :targetId
        END
      )
      ORDER BY events.created_at ASC
    ) AS ordered_events
  ) AS design_events `,
          { targetId }
        )
      )
      .rightJoin("pricing_bids", "design_events.bid_id", "pricing_bids.id")
      .leftJoin("pricing_quotes", "pricing_quotes.id", "pricing_bids.quote_id")
      .where({ "pricing_quotes.id": quoteId })
      .groupBy([
        "pricing_bids.id",
        "design_events.bid_id",
        "design_events.created_at",
      ])
      .orderBy("pricing_bids.id")
      .orderBy("pricing_bids.created_at", "desc")
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
