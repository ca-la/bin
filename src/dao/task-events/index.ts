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
import ProductDesign = require('../../domain-objects/product-design');
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import { findAllDesignsThroughCollaborator } from '../product-designs/dao';

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
    .where({ id: data.taskId })
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
    .orderByRaw('design_stage_ordering asc, ordering asc');

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
    .orderByRaw('design_stage_ordering asc, ordering asc');

  return validateEvery<DetailTaskEventRow, DetailsTaskAdaptedRow>(
    TABLE_NAME,
    isDetailTaskRow,
    detailsAdapter,
    taskResponses
  ).map(createDetailsTask);
}

export async function findByUserId(userId: string): Promise<DetailsTask[]> {
  const designs = await findAllDesignsThroughCollaborator(userId);
  const designIds = designs.map((design: ProductDesign): string => design.id);
  const taskEvents: DetailTaskEventRow[] = await db(TABLE_NAME)
    .select('detail_tasks.*')
    .from(DETAILS_VIEW_NAME)
    .whereIn('design_id', designIds)
    .orderByRaw('design_stage_ordering asc, ordering asc');

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
    .orderByRaw('design_stage_ordering asc, ordering asc');

  return validateEvery<DetailTaskEventRow, DetailsTaskAdaptedRow>(
    TABLE_NAME,
    isDetailTaskRow,
    detailsAdapter,
    taskEvents
  ).map(createDetailsTask);
}
