import * as Knex from 'knex';
import * as process from 'process';
import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';
import {
  POST_APPROVAL_TEMPLATES,
  POST_CREATION_TEMPLATES,
  StageTemplate
} from '../../components/tasks/templates/stages';

const STAGES = [...POST_APPROVAL_TEMPLATES, ...POST_CREATION_TEMPLATES];
const ALL_STAGES = STAGES.map((template: StageTemplate): string => template.id);
const BLANKS_STAGES = STAGES.filter(
  (template: StageTemplate): boolean => {
    return template.title !== 'Sourcing' && template.title !== 'Sampling';
  }
).map((template: StageTemplate) => {
  return template.id;
});

fillProductTypeStages()
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
 * Fills out the `product_type_stages` table with data from `pricing_product_types`.
 * The only difference is on product type blanks vs everything else.
 */
async function fillProductTypeStages(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const pricingProductTypes = (await trx('pricing_product_types').select(
      'id',
      'complexity'
    )) as { id: string; complexity: string }[];

    for (const productType of pricingProductTypes) {
      const stageTemplateIds =
        productType.complexity === 'BLANK' ? BLANKS_STAGES : ALL_STAGES;

      for (const stageTemplateId of stageTemplateIds) {
        const id = uuid.v4();
        log(
          `Creating ProductTypeStage row "${id}", productTypeId "${
            productType.id
          }", stageTemplateId "${stageTemplateId}".`
        );
        await trx('product_type_stages').insert({
          id,
          pricing_product_type_id: productType.id,
          stage_template_id: stageTemplateId
        });
      }
    }
  });
}
