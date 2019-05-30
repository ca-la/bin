import * as Knex from 'knex';
import * as process from 'process';

import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';

removeFulfillmentStage()
  .then(() => {
    log(`${green}Successfully removed!`);
    process.exit();
  })
  .catch(
    (err: any): void => {
      log(`${red}ERROR:\n${reset}`, err);
      process.exit(1);
    }
  );

async function removeFulfillmentStage(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const [fulfillmentStage] = await trx('stage_templates')
      .select('*')
      .where({ title: 'Fulfillment', ordering: 6 });

    await trx('product_design_stages')
      .where({ stage_template_id: fulfillmentStage.id })
      .update({ stage_template_id: null });

    await trx('stage_templates')
      .where({ id: fulfillmentStage.id })
      .del();
  });
}
