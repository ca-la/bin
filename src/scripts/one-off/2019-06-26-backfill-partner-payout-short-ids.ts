import Knex from 'knex';
import process from 'process';

import db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';
import { computeUniqueShortId } from '../../services/short-id';

backfillPartnerPayoutShortIds()
  .then(() => {
    log(
      `${green}Successfully updated all short_ids in the partner_payout_logs table.`
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
 * Adds in a shortId for every partner payout log that does not have a shortId.
 */
async function backfillPartnerPayoutShortIds(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const partnerPayouts = (await trx('partner_payout_logs')
      .select('id')
      .where({ short_id: null })) as { id: string }[];

    for (const partnerPayout of partnerPayouts) {
      const shortId = await computeUniqueShortId();
      log(
        `Adding to partner_payout_log "${
          partnerPayout.id
        }" short_id "${shortId}".`
      );
      await trx('partner_payout_logs')
        .update({ short_id: shortId })
        .where({ id: partnerPayout.id });
    }
  });
}
