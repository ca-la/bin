import Knex from "knex";
import db from "../../../services/db";

export default function attachBidId(
  query: Knex.QueryBuilder,
  userId: string
): Knex.QueryBuilder {
  return query.select([
    db.raw(
      `
      (SELECT
        design_events.bid_id
      FROM
        design_events
      LEFT JOIN
        design_events removed
      ON (
        design_events.bid_id = removed.bid_id
        AND removed.design_id = product_designs.id
        AND removed.type = 'REMOVE_PARTNER'
      )
      WHERE
        design_events.actor_id = ?
        AND design_events.type = 'ACCEPT_SERVICE_BID'
        AND design_events.design_id = product_designs.id
        AND removed.bid_id IS NULL
      LIMIT 1) AS bid_id
    `,
      [userId]
    ),
  ]);
}
