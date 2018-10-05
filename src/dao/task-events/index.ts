import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import TaskEvent, {
  dataAdapter,
  isTaskEventRow,
  isTaskResponseRow,
  responseDataAdapter,
  TaskEventRow,
  TaskResponse,
  TaskResponseRow,
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

export async function findById(taskId: string): Promise<TaskResponse | null> {
  const taskEvents: TaskResponseRow[] = await db(TABLE_NAME)
    .select('task_events.*', 'product_design_stage_tasks.design_stage_id')
    .from(TABLE_NAME)
    .leftJoin(
      'product_design_stage_tasks',
      'task_events.task_id',
      'product_design_stage_tasks.task_id'
    )
    .where({ 'task_events.task_id': taskId })
    .orderBy('created_at', 'desc')
    .limit(1);

  const taskResponse = taskEvents[0];
  if (!taskResponse) { return null; }

  return validate<TaskResponseRow, TaskResponse>(
    TABLE_NAME,
    isTaskResponseRow,
    responseDataAdapter,
    taskResponse
  );
}

export async function findByDesignId(designId: string): Promise<TaskResponse[]> {
  const taskResponses: TaskResponseRow[] = await db(TABLE_NAME)
    .select('task_events.*', 'product_design_stage_tasks.design_stage_id')
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

  return validateEvery<TaskResponseRow, TaskResponse>(
    TABLE_NAME,
    isTaskResponseRow,
    responseDataAdapter,
    taskResponses
  );
}

export async function findByCollectionId(collectionId: string): Promise<TaskResponse[]> {
  const taskResponses: TaskResponseRow[] = await db(TABLE_NAME)
    .select('task_events.*', 'product_design_stage_tasks.design_stage_id')
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

  return validateEvery<TaskResponseRow, TaskResponse>(
    TABLE_NAME,
    isTaskResponseRow,
    responseDataAdapter,
    taskResponses
  );
}

export async function findByStageId(stageId: string): Promise<TaskResponse[]> {
  const taskResponses: TaskResponseRow[] = await db(TABLE_NAME)
    .select('task_events.*', 'product_design_stage_tasks.design_stage_id')
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

  return validateEvery<TaskResponseRow, TaskResponse>(
    TABLE_NAME,
    isTaskResponseRow,
    responseDataAdapter,
    taskResponses
  );
}
