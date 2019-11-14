import Knex from 'knex';
import uuid from 'node-uuid';

import db from '../../services/db';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import TaskTemplate, {
  dataAdapter,
  DesignPhase,
  isTaskTemplateRow,
  partialDataAdapter,
  TaskTemplateRow
} from '../../domain-objects/task-template';

const TABLE_NAME = 'task_templates';

export async function create(
  data: Unsaved<TaskTemplate>,
  trx?: Knex.Transaction
): Promise<TaskTemplate> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4()
  });

  const created = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: TaskTemplateRow[]) => first<TaskTemplateRow>(rows));

  if (!created) {
    throw new Error('Failed to create rows');
  }

  return validate<TaskTemplateRow, TaskTemplate>(
    TABLE_NAME,
    isTaskTemplateRow,
    dataAdapter,
    created
  );
}

export async function update(
  templateId: string,
  data: Partial<TaskTemplate>,
  trx?: Knex.Transaction
): Promise<TaskTemplate> {
  const rowData = partialDataAdapter.forInsertion(data);
  const created = await db(TABLE_NAME)
    .update(rowData)
    .returning('*')
    .where({ id: templateId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: TaskTemplateRow[]) => first<TaskTemplateRow>(rows));

  if (!created) {
    throw new Error('Failed to create rows');
  }

  return validate<TaskTemplateRow, TaskTemplate>(
    TABLE_NAME,
    isTaskTemplateRow,
    dataAdapter,
    created
  );
}

export async function findByPhase(
  phase: DesignPhase,
  trx?: Knex.Transaction
): Promise<TaskTemplate[]> {
  const templates = await db(TABLE_NAME)
    .where({ design_phase: phase })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .orderBy('ordering', 'asc');

  return validateEvery<TaskTemplateRow, TaskTemplate>(
    TABLE_NAME,
    isTaskTemplateRow,
    dataAdapter,
    templates
  );
}

export async function findByStageTitle(
  stageTitle: string,
  trx?: Knex.Transaction
): Promise<TaskTemplate[]> {
  const templates = await db(TABLE_NAME)
    .select('task_templates.*')
    .leftJoin(
      'stage_templates',
      'stage_templates.id',
      'task_templates.stage_template_id'
    )
    .where({ 'stage_templates.title': stageTitle })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .orderBy('task_templates.ordering', 'asc');

  return validateEvery<TaskTemplateRow, TaskTemplate>(
    TABLE_NAME,
    isTaskTemplateRow,
    dataAdapter,
    templates
  );
}
