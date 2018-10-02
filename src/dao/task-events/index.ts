import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import TaskEvent, {
  dataAdapter,
  isTaskEventRow,
  TaskEventRow,
  TaskStatus
} from '../../domain-objects/task-event';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'task_events';

export async function create(data: Unsaved<TaskEvent>): Promise<TaskEvent> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4(),
    status: data.status || TaskStatus.NOT_STARTED
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: TaskEventRow[]) => first<TaskEventRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    created
  );
}

export async function findById(taskId: string): Promise<TaskEvent | null> {
  const taskEvents: TaskEventRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ task_id: taskId })
    .orderBy('created_at', 'desc')
    .limit(1);

  const taskEvent = taskEvents[0];
  if (!taskEvent) { return null; }

  return validate<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    taskEvent
  );
}

export async function findByDesignId(designId: string): Promise<TaskEvent[]> {
  const taskEvents: TaskEventRow[] = await db(TABLE_NAME)
    .select('task_events.*')
    .from(TABLE_NAME)
    .leftJoin(
      'product_design_stage_tasks',
      'product_design_stage_tasks.task_id',
      'task_events.task_id'
    )
    .leftJoin(
      'product_design_stages',
      'product_design_stages.id',
      'product_design_stage_tasks.design_stage_id'
    )
    .where({ 'product_design_stages.design_id': designId })
    .whereNotExists(
      db(TABLE_NAME)
        .select('*')
        .from('task_events as t')
        .whereRaw('task_events.task_id = t.task_id')
        .whereRaw('t.created_at > task_events.created_at')
    );

  return validateEvery<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    taskEvents
  );
}

export async function findByCollectionId(collectionId: string): Promise<TaskEvent[]> {
  const taskEvents: TaskEventRow[] = await db(TABLE_NAME)
    .select('task_events.*')
    .from(TABLE_NAME)
    .leftJoin(
      'product_design_stage_tasks',
      'product_design_stage_tasks.task_id',
      'task_events.task_id'
    )
    .leftJoin(
      'product_design_stages',
      'product_design_stages.id',
      'product_design_stage_tasks.design_stage_id'
    )
    .leftJoin(
      'collection_designs',
      'collection_designs.design_id',
      'product_design_stages.design_id'
    )
    .where({ 'collection_designs.collection_id': collectionId })
    .whereNotExists(
      db(TABLE_NAME)
        .select('*')
        .from('task_events as t')
        .whereRaw('task_events.task_id = t.task_id')
        .whereRaw('t.created_at > task_events.created_at')
    );

  return validateEvery<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    taskEvents
  );
}

export async function findByStageId(stageId: string): Promise<TaskEvent[]> {
  const taskEvents: TaskEventRow[] = await db(TABLE_NAME)
    .select('task_events.*')
    .from(TABLE_NAME)
    .leftJoin(
      'product_design_stage_tasks',
      'product_design_stage_tasks.task_id',
      'task_events.task_id'
    )
    .where({ 'product_design_stage_tasks.design_stage_id': stageId })
    .whereNotExists(
      db(TABLE_NAME)
        .select('*')
        .from('task_events as t')
        .whereRaw('task_events.task_id = t.task_id')
        .whereRaw('t.created_at > task_events.created_at')
    );

  return validateEvery<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    taskEvents
  );
}
