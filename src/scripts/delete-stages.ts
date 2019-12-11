import process from 'process';

import { log, logServerError } from '../services/logger';
import { green, reset } from '../services/colors';
import db from '../services/db';

async function run(): Promise<void> {
  const stageIds = process.argv.slice(2);

  if (stageIds.length < 1) {
    throw new Error(
      'Usage: delete-stages.ts [designStageId] [designStageId2]...'
    );
  }

  // Delete related rows from
  // - task_events
  // - product_design_stage_tasks
  // - product_design_stages
  // - collaborator_tasks
  // - tasks
  for (const stageId of stageIds) {
    log(`Processing stage ${stageId}...`);

    const taskIds: string[] = (await db.raw(
      `
      delete from task_events
      using product_design_stage_tasks
      where
        task_events.task_id = product_design_stage_tasks.task_id
        AND product_design_stage_tasks.design_stage_id = ?
      returning task_events.task_id as id;
    `,
      [stageId]
    )).rows.map((row: { id: string }) => row.id);

    await db.raw(
      `
      delete from product_design_stage_tasks
      where design_stage_id = ?
      `,
      [stageId]
    );

    await db.raw(
      `
      delete from product_design_stages
      where id = ?
      `,
      [stageId]
    );

    if (taskIds.length > 0) {
      await db.raw(
        `
      delete from collaborator_tasks
      where task_id = ANY(?)
      `,
        [taskIds]
      );

      await db.raw(
        `
      delete from tasks
      where id = ANY(?)
      `,
        [taskIds]
      );
    }
  }
}

run()
  .then(() => {
    log(green, `Complete!`, reset);
    process.exit();
  })
  .catch(
    (err: any): void => {
      logServerError(err);
      process.exit(1);
    }
  );
