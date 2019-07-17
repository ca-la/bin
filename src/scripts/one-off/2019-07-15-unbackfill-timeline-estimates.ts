import * as Knex from 'knex';
import * as process from 'process';

import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';

const CUTOFF_DATE = '2019-04-28 00:00:00.000000+00';

unbackfillTimelineEstimates()
  .then(() => {
    log(
      `${green}Successfully removed backfill from prcing_quotes timeline estimates`
    );
    process.exit();
  })
  .catch(
    (error: any): void => {
      log(`${red}ERROR:\n${reset}`, error);
      process.exit(1);
    }
  );

/**
 * Removes the values set for stage_ms fields prior to a set date
 */
async function unbackfillTimelineEstimates(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    await trx('pricing_quotes')
      .update({
        creation_time_ms: null,
        specification_time_ms: null,
        sourcing_time_ms: null,
        sampling_time_ms: null,
        pre_production_time_ms: null,
        production_time_ms: null,
        fulfillment_time_ms: null,
        process_time_ms: null
      })
      .where('created_at', '<', new Date(CUTOFF_DATE));
  });
}
