import Knex from 'knex';
import process from 'process';

import db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';
import { computeUniqueShortId } from '../../services/short-id';

backfillInvoiceShortIds()
  .then(() => {
    log(`${green}Successfully updated all short_ids in the invoices table.`);
    process.exit();
  })
  .catch(
    (error: any): void => {
      log(`${red}ERROR:\n${reset}`, error);
      process.exit(1);
    }
  );

/**
 * Adds in a shortId for every invoice that does not have a shortId.
 */
async function backfillInvoiceShortIds(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const invoices = (await trx('invoices')
      .select('id')
      .where({ short_id: null })) as { id: string }[];

    for (const invoice of invoices) {
      const shortId = await computeUniqueShortId();
      log(`Adding to invoice "${invoice.id}" short_id "${shortId}".`);
      await trx('invoices')
        .update({ short_id: shortId })
        .where({ id: invoice.id });
    }
  });
}
