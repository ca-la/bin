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

export async function findById(taskId: string): Promise<TaskEvent> {
  const taskEvent: TaskEventRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ task_id: taskId })
    .orderBy('created_at', 'desc')
    .limit(1);

  return validate<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    taskEvent[0]
  );
}

export async function findByCollectionId(collectionId: string): Promise<TaskEvent[]> {
  const taskEvents: TaskEventRow[] = await db(TABLE_NAME)
    .select('task_events.*')
    .from(TABLE_NAME)
    .leftJoin('collection_stage_tasks', 'collection_stage_tasks.task_id', 'task_events.task_id')
    .leftJoin(
      'collection_stages',
      'collection_stages.id',
      'collection_stage_tasks.collection_stage_id'
    )
    .where({ 'collection_stages.collection_id': collectionId })
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
    .leftJoin('collection_stage_tasks', 'collection_stage_tasks.task_id', 'task_events.task_id')
    .where({ 'collection_stage_tasks.collection_stage_id': stageId })
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
