import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import TaskTemplate, {
  dataAdapter,
  DesignPhase,
  isTaskTemplateRow,
  TaskTemplateRow
} from '../../domain-objects/task-template';

const TABLE_NAME = 'task_templates';

export async function create(data: Unsaved<TaskTemplate>): Promise<TaskTemplate> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4()
  });

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then((rows: TaskTemplateRow[]) => first<TaskTemplateRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<TaskTemplateRow, TaskTemplate>(
    TABLE_NAME,
    isTaskTemplateRow,
    dataAdapter,
    created
  );
}

export async function findByPhase(phase: DesignPhase): Promise<TaskTemplate[]> {
  const templates = await db(TABLE_NAME)
    .where({ design_phase: phase });

  return validateEvery<TaskTemplateRow, TaskTemplate>(
    TABLE_NAME,
    isTaskTemplateRow,
    dataAdapter,
    templates
  );
}
