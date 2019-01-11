import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import * as db from '../../services/db';
import TaskEvent, {
  createDetailsTask,
  dataAdapter,
  detailsAdapter,
  DetailsTask,
  DetailsTaskAdaptedRow,
  DetailTaskEventRow,
  isDetailTaskRow,
  TaskEventRow,
  TaskStatus
} from '../../domain-objects/task-event';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'task_events';
const DETAILS_VIEW_NAME = 'detail_tasks';

export async function create(data: Unsaved<TaskEvent>): Promise<DetailsTask> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4(),
    status: data.status || TaskStatus.NOT_STARTED
  });
  const created = await db(TABLE_NAME)
    .insert(omit(rowData, ['design_stage_id']), '*')
    .then((rows: TaskEventRow[]) => first<TaskEventRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  const taskEvent = await db(TABLE_NAME)
    .select('*')
    .from(DETAILS_VIEW_NAME)
    .where({ id: created.task_id })
    .then((rows: DetailTaskEventRow[]) => first<DetailTaskEventRow>(rows));

  if (!taskEvent) { throw new Error('Failed to get with stage ID'); }

  return createDetailsTask(validate<DetailTaskEventRow, DetailsTaskAdaptedRow>(
    TABLE_NAME,
    isDetailTaskRow,
    detailsAdapter,
    taskEvent
  ));
}

export async function findById(id: string): Promise<DetailsTask | null> {
  const taskEvent: DetailTaskEventRow | undefined = await db(DETAILS_VIEW_NAME)
    .select('*')
    .from(DETAILS_VIEW_NAME)
    .where({ id })
    .then((rows: DetailTaskEventRow[]) => first<DetailTaskEventRow>(rows));

  if (!taskEvent) { return null; }

  return createDetailsTask(validate<DetailTaskEventRow, DetailsTaskAdaptedRow>(
    TABLE_NAME,
    isDetailTaskRow,
    detailsAdapter,
    taskEvent
  ));
}

export async function findByDesignId(designId: string): Promise<DetailsTask[]> {
  const taskEvents: DetailTaskEventRow[] = await db(TABLE_NAME)
    .select('*')
    .from(DETAILS_VIEW_NAME)
    .where({ design_id: designId })
    .orderBy('ordering', 'asc');

  return validateEvery<DetailTaskEventRow, DetailsTaskAdaptedRow>(
    TABLE_NAME,
    isDetailTaskRow,
    detailsAdapter,
    taskEvents
  ).map(createDetailsTask);
}

export async function findByCollectionId(collectionId: string): Promise<DetailsTask[]> {
  const taskResponses: DetailTaskEventRow[] = await db(TABLE_NAME)
    .select('*')
    .from(DETAILS_VIEW_NAME)
    .where({ collection_id: collectionId })
    .orderBy('ordering', 'asc');

  return validateEvery<DetailTaskEventRow, DetailsTaskAdaptedRow>(
    TABLE_NAME,
    isDetailTaskRow,
    detailsAdapter,
    taskResponses
  ).map(createDetailsTask);
}

export async function findByUserId(userId: string): Promise<DetailsTask[]> {
  const taskEvents: DetailTaskEventRow[] = await db(TABLE_NAME)
    .select('detail_tasks.*')
    .from(DETAILS_VIEW_NAME)
    .join(
      'collaborator_tasks',
      'detail_tasks.id',
      'collaborator_tasks.task_id'
    )
    .join(
      'collaborators',
      'collaborator_tasks.collaborator_id',
      'collaborators.id'
    )
    .where({ 'collaborators.user_id': userId })
    .orderBy('detail_tasks.ordering', 'asc');

  return validateEvery<DetailTaskEventRow, DetailsTaskAdaptedRow>(
    TABLE_NAME,
    isDetailTaskRow,
    detailsAdapter,
    taskEvents
  ).map(createDetailsTask);
}

export async function findByStageId(stageId: string): Promise<DetailsTask[]> {
  const taskEvents: DetailTaskEventRow[] = await db(TABLE_NAME)
    .select('*')
    .from(DETAILS_VIEW_NAME)
    .where({ design_stage_id: stageId })
    .orderBy('ordering', 'asc');

  return validateEvery<DetailTaskEventRow, DetailsTaskAdaptedRow>(
    TABLE_NAME,
    isDetailTaskRow,
    detailsAdapter,
    taskEvents
  ).map(createDetailsTask);
}
