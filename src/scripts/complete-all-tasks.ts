import process from 'process';

import { log, logServerError } from '../services/logger';
import { green, reset } from '../services/colors';
import { create } from '../dao/task-events';
import { TaskEventRow, TaskStatus } from '../domain-objects/task-event';
import db from '../services/db';

async function run(): Promise<void> {
  const designIds = process.argv.slice(2);

  if (designIds.length < 1) {
    throw new Error('Usage: complete-all-tasks.ts [designId] [designId2]...');
  }

  for (const designId of designIds) {
    log(`Processing design ${designId}...`);

    const latestEvents: TaskEventRow[] = (await db.raw(
      `
      select distinct on (events.task_id) events.*
      from product_design_stages as stg
      inner join product_design_stage_tasks as st
        on st.design_stage_id = stg.id
      inner join task_events as events
        on events.task_id = st.task_id
      where stg.design_id = ?
      order by events.task_id, events.created_at desc;
    `,
      [designId]
    )).rows;

    log(`Found ${latestEvents.length} tasks to complete`);

    for (const event of latestEvents) {
      if (event.status !== TaskStatus.NOT_STARTED) {
        log(`Task ${event.task_id} isn't unstarted, skipping...`);
        continue;
      }

      await create({
        dueDate: event.due_date,
        status: TaskStatus.COMPLETED,
        title: event.title,
        description: event.description,
        taskId: event.task_id,
        createdBy: event.created_by,
        designStageId: null,
        ordering: event.ordering
      });

      log(`Completed task ${event.task_id}`);
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
