import Knex from 'knex';
import process from 'process';

import db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';

backfillPricingCostInputExpiration()
  .then(() => {
    log(
      `${green}Successfully backfilled expiration values for pricing cost inputs.`
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
 * Gets all pricing_cost_inputs that are not deleted and do not already have an expiration
 * set. Sets the expiration to two weeks after the creation date.
 */
async function backfillPricingCostInputExpiration(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const result = await trx.raw(`
UPDATE pricing_cost_inputs
SET expires_at = created_at + INTERVAL '2 weeks'
WHERE expires_at IS NULL
  AND deleted_at IS NULL;
    `);

    log(`${green}Successfully updated ${result.rowCount} rows.`);
  });
}
