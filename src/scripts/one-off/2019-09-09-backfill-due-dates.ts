import Knex from 'knex';
import pg from 'pg';
import process from 'process';

import db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';
import meow from 'meow';

const cli = meow('', {
  flags: {
    dryRun: {
      default: false,
      type: 'boolean'
    }
  }
});

backfillBidDueDates()
  .then(() => {
    process.exit();
  })
  .catch(
    (error: any): void => {
      log(`${red}ERROR:\n${reset}`, error);
      process.exit(1);
    }
  );

/**
 * Backfill all bids to include a due date derived from adding the bid's created
 * date to the number of milliseconds the project was due in
 */
async function backfillBidDueDates(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    await trx.raw(`
CREATE TEMPORARY VIEW bids_with_accepted_at AS
  SELECT DISTINCT ON (pricing_bids.id) pricing_bids.*,
      CASE WHEN "design_events"."bid_id" IN (

        SELECT "design_events"."bid_id"
          FROM "design_events"
         WHERE "design_events"."type" IN ('ACCEPT_SERVICE_BID')

      ) AND "design_events"."bid_id" NOT IN (

        SELECT "design_events"."bid_id"
          FROM "design_events"
         WHERE "design_events"."type" IN ('REMOVE_PARTNER')

      ) THEN (
        SELECT "design_events"."created_at"
          FROM "design_events"
         WHERE "design_events"."type" IN ('ACCEPT_SERVICE_BID')
           AND "design_events"."bid_id" = "pricing_bids"."id"
         ORDER BY "design_events"."created_at" DESC LIMIT 1
      ) ELSE null END
    AS accepted_at
  FROM "design_events"
 RIGHT JOIN "pricing_bids" ON "design_events"."bid_id" = "pricing_bids"."id"
 GROUP BY "pricing_bids"."id", "design_events"."bid_id", "design_events"."created_at";
`);

    const bidsToUpdate = await trx
      .select('id')
      .from('bids_with_accepted_at')
      .whereNot({ project_due_in_ms: null });

    if (bidsToUpdate.length === 0) {
      log(`${reset}No bids needed updating, skipping!`);
      return;
    }

    log(`${reset}Expecting to update ${bidsToUpdate.length} bids`);

    const result: pg.QueryResult = await trx.raw(`
UPDATE pricing_bids
   SET due_date = (bids_with_accepted.accepted_at + INTERVAL '1 millisecond' * pricing_bids.project_due_in_ms)
  FROM bids_with_accepted_at AS bids_with_accepted
 WHERE pricing_bids.project_due_in_ms IS NOT NULL
   AND pricing_bids.id = bids_with_accepted.id;
    `);

    await trx.raw(`
DROP VIEW bids_with_accepted_at;
`);

    if (bidsToUpdate.length !== result.rowCount) {
      throw new Error(
        `Did not update the expected number of rows\nBids to update: ${
          bidsToUpdate.length
        }, but updated ${result.rowCount}`
      );
    }

    log(`${green}Successfully updated ${result.rowCount} bids.`);
    if (cli.flags.dryRun) {
      return trx.rollback(new Error('Dry run detected, rolling back!'));
    }
  });
}
