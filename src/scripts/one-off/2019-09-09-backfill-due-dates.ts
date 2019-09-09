import * as Knex from 'knex';
import * as process from 'process';

import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';

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
    const bidsToUpdate = await trx
      .select('id')
      .from('pricing_bids')
      .whereRaw(`due_date IS NULL AND project_due_in_ms IS NOT NULL`);

    if (bidsToUpdate.length === 0) {
      log(`${reset}No bids needed updating, skipping!`);
      return;
    }

    log(`${reset}Expecting to update ${bidsToUpdate.length} bids`);
    const result = await trx.raw(`
UPDATE pricing_bids
   SET due_date = (created_at + INTERVAL '1 millisecond' * project_due_in_ms)
 WHERE due_date IS NULL
   AND project_due_in_ms IS NOT NULL;
    `);
    if (bidsToUpdate.length !== result.rowCount) {
      throw new Error(
        `Did not update the expected number of rows\nBids to update: ${
          bidsToUpdate.length
        }, but updated ${result.rowCount}`
      );
    }

    log(`${green}Successfully updated ${result.rowCount} bids.`);
  });
}
