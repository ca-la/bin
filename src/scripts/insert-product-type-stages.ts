import * as Knex from 'knex';
import * as process from 'process';
import * as uuid from 'node-uuid';
import { chunk } from 'lodash';

import * as db from '../services/db';
import { log } from '../services/logger';
import { green, red, reset } from '../services/colors';
import {
  POST_APPROVAL_TEMPLATES,
  POST_CREATION_TEMPLATES,
  StageTemplate
} from '../components/tasks/templates/stages';
import { ProductTypeStageRow } from '../components/product-type-stages/domain-object';

const STAGES = [...POST_APPROVAL_TEMPLATES, ...POST_CREATION_TEMPLATES];
const ALL_STAGES = STAGES.map((template: StageTemplate): string => template.id);
const BLANKS_STAGES = STAGES.filter(
  (template: StageTemplate): boolean => {
    return template.title !== 'Sourcing' && template.title !== 'Sampling';
  }
).map((template: StageTemplate) => {
  return template.id;
});

insertProductTypeStages()
  .then(() => {
    log(
      `${green}Successfully inserted all data into the product_type_stages table.`
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
 * Fills in the `product_type_stages` table with data from the latest version of
 * `pricing_product_types`. The only difference on insertions is between product type
 * blanks vs everything else.
 */

interface Row {
  id: string;
  complexity: string;
}

async function insertProductTypeStages(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    log('Removing all existing product_type_stages rows');
    await trx.raw(`
TRUNCATE TABLE product_type_stages;
`);

    const pricingProductTypes: Row[] = await trx(
      'pricing_product_types'
    ).select('id', 'complexity');
    log(
      `Inserting stage type rows from ${
        pricingProductTypes.length
      } product types.`
    );

    const insertions: ProductTypeStageRow[] = [];
    for (const productType of pricingProductTypes) {
      const stageTemplateIds =
        productType.complexity === 'BLANK' ? BLANKS_STAGES : ALL_STAGES;

      for (const stageTemplateId of stageTemplateIds) {
        const id = uuid.v4();
        insertions.push({
          id,
          pricing_product_type_id: productType.id,
          stage_template_id: stageTemplateId
        });
      }
    }

    log(`Preparing ${insertions.length} ProductTypeStages for insertion`);

    for (const c of chunk(insertions, 10000)) {
      log(`Creating ${c.length} ProductTypeStages`);
      await trx('product_type_stages').insert(c);
    }
  });
}
