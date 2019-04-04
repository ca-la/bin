import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import * as db from '../../services/db';
import TaskEvent, {
  createDetailsTask,
  dataAdapter,
  DetailsTaskWithAssignees,
  DetailsTaskWithAssigneesAdaptedRow,
  detailsWithAssigneesAdapter,
  DetailTaskEventRow,
  DetailTaskWithAssigneesEventRow,
  isDetailTaskWithAssigneeRow,
  TaskEventRow,
  TaskStatus
} from '../../domain-objects/task-event';
import ProductDesign = require('../../domain-objects/product-design');
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import { findAllDesignsThroughCollaborator } from '../product-designs/dao';
import limitOrOffset from '../../services/limit-or-offset';
import { VIEW_RAW } from './view';

const TABLE_NAME = 'task_events';
const VIEW_ALIAS = 'detail_tasks_with_assignees';

/**
 * This will group group tasks in 4 ways:
 *
 * Collection: designs in the same collection will be grouped
 * Design: stages in the same design will be grouped
 * Stage: stage order is kept
 * Task: task order is kept
 *
 * The order is important so that your most recent designs show first
 */
// tslint:disable-next-line:max-line-length
const VIEW_ORDERING = 'collection_created_at desc, design_created_at desc, design_stage_ordering asc, ordering asc';

export async function create(
  data: Unsaved<TaskEvent>,
  trx?: Knex.Transaction
): Promise<DetailsTaskWithAssignees> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4(),
    status: data.status || TaskStatus.NOT_STARTED
  });
  const created = await db(TABLE_NAME)
    .insert(omit(rowData, ['design_stage_id']), '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: TaskEventRow[]) => first<TaskEventRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  const taskEvent = await db(TABLE_NAME)
    .with(VIEW_ALIAS, VIEW_RAW)
    .select('*')
    .from(VIEW_ALIAS)
    .where({ id: data.taskId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: DetailTaskWithAssigneesEventRow[]) =>
      first<DetailTaskWithAssigneesEventRow>(rows));

  if (!taskEvent) { throw new Error('Failed to get with stage ID'); }

  return createDetailsTask(
    validate<DetailTaskWithAssigneesEventRow, DetailsTaskWithAssigneesAdaptedRow>(
      TABLE_NAME,
      isDetailTaskWithAssigneeRow,
      detailsWithAssigneesAdapter,
      taskEvent
    ));
}

export async function findById(id: string): Promise<DetailsTaskWithAssignees | null> {
  const taskEvent: DetailTaskWithAssigneesEventRow | undefined =
    await db(TABLE_NAME)
      .with(VIEW_ALIAS, VIEW_RAW)
      .select('*')
      .from(VIEW_ALIAS)
      .where({ id })
      .then((rows: DetailTaskEventRow[]) => first<DetailTaskEventRow>(rows));

  if (!taskEvent) { return null; }

  return createDetailsTask(
    validate<DetailTaskWithAssigneesEventRow, DetailsTaskWithAssigneesAdaptedRow>(
      TABLE_NAME,
      isDetailTaskWithAssigneeRow,
      detailsWithAssigneesAdapter,
      taskEvent
    ));
}

export async function findByDesignId(
  designId: string,
  limit?: number,
  offset?: number
): Promise<DetailsTaskWithAssignees[]> {
  const taskEvents: DetailTaskWithAssigneesEventRow[] = await db(TABLE_NAME)
    .with(VIEW_ALIAS, VIEW_RAW)
    .select('*')
    .from(VIEW_ALIAS)
    .where({ design_id: designId })
    .modify(limitOrOffset(limit, offset))
    .orderByRaw(VIEW_ORDERING);

  return validateEvery<DetailTaskWithAssigneesEventRow, DetailsTaskWithAssigneesAdaptedRow>(
    TABLE_NAME,
    isDetailTaskWithAssigneeRow,
    detailsWithAssigneesAdapter,
    taskEvents
  ).map(createDetailsTask);
}

export async function findByCollectionId(
  collectionId: string,
  limit?: number,
  offset?: number
): Promise<DetailsTaskWithAssignees[]> {
  const taskResponses: DetailTaskWithAssigneesEventRow[] = await db(TABLE_NAME)
    .with(VIEW_ALIAS, VIEW_RAW)
    .select('*')
    .from(VIEW_ALIAS)
    .where({ collection_id: collectionId })
    .modify(limitOrOffset(limit, offset))
    .orderByRaw(VIEW_ORDERING);

  return validateEvery<DetailTaskWithAssigneesEventRow, DetailsTaskWithAssigneesAdaptedRow>(
    TABLE_NAME,
    isDetailTaskWithAssigneeRow,
    detailsWithAssigneesAdapter,
    taskResponses
  ).map(createDetailsTask);
}

export async function findByUserId(
  userId: string,
  limit?: number,
  offset?: number
): Promise<DetailsTaskWithAssignees[]> {
  const designs = await findAllDesignsThroughCollaborator(userId);
  const designIds = designs.map((design: ProductDesign): string => design.id);
  const taskEvents: DetailTaskWithAssigneesEventRow[] = await db(TABLE_NAME)
    .with(VIEW_ALIAS, VIEW_RAW)
    .select('*')
    .from(VIEW_ALIAS)
    .whereIn('design_id', designIds)
    .modify(limitOrOffset(limit, offset))
    .orderByRaw(VIEW_ORDERING);

  return validateEvery<DetailTaskWithAssigneesEventRow, DetailsTaskWithAssigneesAdaptedRow>(
    TABLE_NAME,
    isDetailTaskWithAssigneeRow,
    detailsWithAssigneesAdapter,
    taskEvents
  ).map(createDetailsTask);
}

export async function findByStageId(
  stageId: string,
  limit?: number,
  offset?: number
): Promise<DetailsTaskWithAssignees[]> {
  const taskEvents: DetailTaskWithAssigneesEventRow[] = await db(TABLE_NAME)
    .with(VIEW_ALIAS, VIEW_RAW)
    .select('*')
    .from(VIEW_ALIAS)
    .where({ design_stage_id: stageId })
    .modify(limitOrOffset(limit, offset))
    .orderByRaw(VIEW_ORDERING);

  return validateEvery<DetailTaskWithAssigneesEventRow, DetailsTaskWithAssigneesAdaptedRow>(
    TABLE_NAME,
    isDetailTaskWithAssigneeRow,
    detailsWithAssigneesAdapter,
    taskEvents
  ).map(createDetailsTask);
}
