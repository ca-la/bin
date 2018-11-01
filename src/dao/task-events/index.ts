import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import * as db from '../../services/db';
import TaskEvent, {
  dataAdapter,
  isTaskEventRow,
  isTaskEventWithStage,
  TaskEventRow,
  TaskEventRowWithStage,
  TaskStatus,
  withStageAdapter
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
    .insert(omit(rowData, ['design_stage_id']), '*')
    .then((rows: TaskEventRow[]) => first<TaskEventRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  const withStage = await db(TABLE_NAME)
    .select('task_events.*', 'product_design_stage_tasks.design_stage_id')
    .leftJoin(
      'product_design_stage_tasks',
      'task_events.task_id',
      'product_design_stage_tasks.task_id'
    )
    .where({ 'task_events.id': created.id })
    .orderBy('created_at', 'desc')
    .limit(1)
    .then((rows: TaskEventRowWithStage[]) => first<TaskEventRowWithStage>(rows));

  if (!withStage) { throw new Error('Failed to get with stage ID'); }

  return validate<TaskEventRowWithStage, TaskEvent>(
    TABLE_NAME,
    isTaskEventWithStage,
    withStageAdapter,
    withStage
  );
}

export async function findById(taskId: string): Promise<TaskEvent | null> {
  const taskEvents: TaskEventRowWithStage[] = await db(TABLE_NAME)
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

  return validate<TaskEventRowWithStage, TaskEvent>(
    TABLE_NAME,
    isTaskEventWithStage,
    withStageAdapter,
    taskResponse
  );
}

export async function findByDesignId(designId: string): Promise<TaskEvent[]> {
  const taskResponses: TaskEventRowWithStage[] = await db(TABLE_NAME)
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

  return validateEvery<TaskEventRowWithStage, TaskEvent>(
    TABLE_NAME,
    isTaskEventWithStage,
    withStageAdapter,
    taskResponses
  );
}

export async function findByCollectionId(collectionId: string): Promise<TaskEvent[]> {
  const taskResponses: TaskEventRowWithStage[] = await db(TABLE_NAME)
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

  return validateEvery<TaskEventRowWithStage, TaskEvent>(
    TABLE_NAME,
    isTaskEventWithStage,
    withStageAdapter,
    taskResponses
  );
}

export async function findByUserId(userId: string): Promise<TaskEvent[]> {
  const taskResponses: TaskEventRow[] = await db(TABLE_NAME)
    .select('task_events.*')
    .join(
      'collaborator_tasks',
      'task_events.task_id',
      'collaborator_tasks.task_id'
    )
    .join(
      'collaborators',
      'collaborator_tasks.collaborator_id',
      'collaborators.id'
    )
    .where({ 'collaborators.user_id': userId })
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
    taskResponses
  );
}

export async function findByStageId(stageId: string): Promise<TaskEvent[]> {
  const taskResponses: TaskEventRowWithStage[] = await db(TABLE_NAME)
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

  return validateEvery<TaskEventRowWithStage, TaskEvent>(
    TABLE_NAME,
    isTaskEventWithStage,
    withStageAdapter,
    taskResponses
  );
}
