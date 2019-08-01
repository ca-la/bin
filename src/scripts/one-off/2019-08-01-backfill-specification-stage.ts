import * as Knex from 'knex';
import * as pg from 'pg';
import * as process from 'process';

import * as db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset } from '../../services/colors';
import createDesignTasks from '../../services/create-design-tasks';

backfillSpecificationStage()
  .then(() => {
    log(`${green}Successfully updated all designs to include Specification`);
    process.exit();
  })
  .catch(
    (error: any): void => {
      log(`${red}ERROR:\n${reset}`, error);
      process.exit(1);
    }
  );

interface Row {
  design_id: string;
  id: string;
}

/**
 * Fixes a short period where we were not generating the Specification stage
 */
async function backfillSpecificationStage(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const creationWithoutSpecification = await trx
      .raw(
        `
SELECT design_id, id FROM product_design_stages
 WHERE title = 'Creation'
   AND design_id NOT IN (
     SELECT design_id FROM product_design_stages
      WHERE title = 'Specification'
   );
`
      )
      .then((result: pg.QueryResult) => result.rows as Row[]);

    if (creationWithoutSpecification.length === 0) {
      throw new Error(
        'Could not find any designs that were missing the Specification stage'
      );
    }

    await trx
      .delete()
      .from('product_design_stage_tasks')
      .whereIn(
        'design_stage_id',
        creationWithoutSpecification.map((row: Row) => row.id)
      );

    const deletedStageCount: number = await trx
      .delete()
      .from('product_design_stages')
      .whereIn(
        'design_id',
        creationWithoutSpecification.map((row: Row) => row.design_id)
      );

    if (deletedStageCount !== creationWithoutSpecification.length) {
      throw new Error('Deleted a different number of stages than designs!');
    }

    for (const row of creationWithoutSpecification) {
      const tasks = await createDesignTasks(
        row.design_id,
        'POST_CREATION',
        trx
      );

      log(`Created ${tasks.length} tasks for design ${row.design_id}`);
    }

    const postRunRowCheck = await trx
      .raw(
        `
SELECT DISTINCT design_id FROM product_design_stages
 WHERE title = 'Creation'
   AND design_id NOT IN (
     SELECT design_id FROM product_design_stages
      WHERE title = 'Specification'
   );
`
      )
      .then((result: pg.QueryResult) => result.rowCount);

    if (postRunRowCheck !== 0) {
      throw new Error('There are still missing rows. Aborting.');
    }
  });
}
