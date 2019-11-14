import Knex from 'knex';

import db from '../services/db';
import * as ProductDesignStagesDAO from '../dao/product-design-stages';
import * as TaskTemplatesDAO from '../dao/task-templates';
import Logger = require('../services/logger');
import { createTasksFromTemplates } from '../services/create-design-tasks';

async function createTasks(): Promise<void> {
  const designId = process.argv[2];
  const stageTitle = process.argv[3];

  if (!designId || !stageTitle) {
    throw new Error(
      'Usage: insert-tasks-by-stage.ts [design ID] [stage title]'
    );
  }

  await db.transaction(async (trx: Knex.Transaction) => {
    const taskTemplates = await TaskTemplatesDAO.findByStageTitle(stageTitle);

    Logger.log(
      `Found ${taskTemplates.length} task templates for stage ${stageTitle}`
    );
    const stages = await ProductDesignStagesDAO.findAllByDesignId(designId);

    Logger.log(`Found ${stages.length} existing stages for design`);

    const tasks = await createTasksFromTemplates(
      designId,
      taskTemplates,
      stages,
      trx
    );
    Logger.log(`Successfully created ${tasks.length} tasks`);
  });
}

createTasks()
  .then(() => {
    process.exit(0);
  })
  .catch((err: Error) => {
    Logger.logServerError(err);
    process.exit(1);
  });
