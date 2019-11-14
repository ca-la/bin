import Knex from 'knex';
import process from 'process';

import * as TaskTemplatesDAO from '../../dao/task-templates';
import db from '../../services/db';
import { log } from '../../services/logger';
import { green, red, reset, yellow } from '../../services/colors';
import TaskTemplate from '../../domain-objects/task-template';

async function moveSpecificationPostCreation(): Promise<TaskTemplate[]> {
  const specificationTasks = await TaskTemplatesDAO.findByStageTitle(
    'Specification'
  );

  if (specificationTasks.length === 0) {
    log(`${yellow}No tasks found for Specification stage${reset}`);
    return [];
  }

  return db.transaction(async (trx: Knex.Transaction) =>
    Promise.all(
      specificationTasks.map(
        (template: TaskTemplate): Promise<TaskTemplate> =>
          TaskTemplatesDAO.update(
            template.id,
            {
              designPhase: 'POST_CREATION'
            },
            trx
          )
      )
    )
  );
}

moveSpecificationPostCreation()
  .then((templates: TaskTemplate[]) => {
    log(`${green}Success!${reset}

${JSON.stringify(templates, null, 2)}`);
    process.exit();
  })
  .catch(
    (err: any): void => {
      log(`${red}ERROR:\n${reset}`, err);
      process.exit(1);
    }
  );
