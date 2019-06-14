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
  DetailTaskWithAssigneesEventRow,
  isDetailTaskWithAssigneeRow,
  TaskEventRow,
  TaskStatus
} from '../../domain-objects/task-event';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import { findAllDesignIdsThroughCollaborator } from '../../components/product-designs/dao';
import limitOrOffset from '../../services/limit-or-offset';
import {
  ALIASES,
  getAssigneesBuilder,
  getBuilder as getTaskViewBuilder
} from './view';
import {
  ALIASES as COLLABORATOR_ALIASES,
  getBuilder as getCollaboratorsBuilder
} from '../../components/collaborators/view';

const TABLE_NAME = 'task_events';

/**
 * This will group tasks in 4 ways:
 *
 * Design: stages in the same design will be grouped
 * Stage: stage order is kept
 * Task: task order is kept
 *
 * The order is important so that your most recent designs show first
 */
// tslint:disable-next-line:max-line-length
const VIEW_ORDERING =
  'design_created_at desc, design_stage_ordering asc, ordering asc';

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

  if (!created) {
    throw new Error('Failed to create rows');
  }

  const taskEvent = await getTaskViewBuilder()
    .where({ [ALIASES.taskId]: data.taskId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: DetailTaskWithAssigneesEventRow[]) =>
      first<DetailTaskWithAssigneesEventRow>(rows)
    );

  if (!taskEvent) {
    throw new Error('Failed to get by id');
  }

  return createDetailsTask(
    validate<
      DetailTaskWithAssigneesEventRow,
      DetailsTaskWithAssigneesAdaptedRow
    >(
      TABLE_NAME,
      isDetailTaskWithAssigneeRow,
      detailsWithAssigneesAdapter,
      taskEvent
    )
  );
}

export async function findById(
  id: string
): Promise<DetailsTaskWithAssignees | null> {
  const taskEvent:
    | DetailTaskWithAssigneesEventRow
    | undefined = await getTaskViewBuilder()
    .where({ [ALIASES.taskId]: id })
    .then((rows: DetailTaskWithAssigneesEventRow[]) =>
      first<DetailTaskWithAssigneesEventRow>(rows)
    );

  if (!taskEvent) {
    return null;
  }

  return createDetailsTask(
    validate<
      DetailTaskWithAssigneesEventRow,
      DetailsTaskWithAssigneesAdaptedRow
    >(
      TABLE_NAME,
      isDetailTaskWithAssigneeRow,
      detailsWithAssigneesAdapter,
      taskEvent
    )
  );
}

export async function findByDesignId(
  designId: string,
  limit?: number,
  offset?: number
): Promise<DetailsTaskWithAssignees[]> {
  const taskEvents: DetailTaskWithAssigneesEventRow[] = await getTaskViewBuilder()
    .where({ [ALIASES.designId]: designId })
    .modify(limitOrOffset(limit, offset))
    .orderByRaw(VIEW_ORDERING);

  return validateEvery<
    DetailTaskWithAssigneesEventRow,
    DetailsTaskWithAssigneesAdaptedRow
  >(
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
  const taskResponses: DetailTaskWithAssigneesEventRow[] = await getTaskViewBuilder()
    .where({ [ALIASES.collectionId]: collectionId })
    .modify(limitOrOffset(limit, offset))
    .orderByRaw(VIEW_ORDERING);

  return validateEvery<
    DetailTaskWithAssigneesEventRow,
    DetailsTaskWithAssigneesAdaptedRow
  >(
    TABLE_NAME,
    isDetailTaskWithAssigneeRow,
    detailsWithAssigneesAdapter,
    taskResponses
  ).map(createDetailsTask);
}

export interface TasksListOptions {
  assignFilterUserId?: string;
  stageFilter?: string;
  limit?: number;
  offset?: number;
}

export async function findByUserId(
  userId: string,
  options: TasksListOptions = {}
): Promise<DetailsTaskWithAssignees[]> {
  const designIds = await findAllDesignIdsThroughCollaborator(userId);
  const { assignFilterUserId, stageFilter, limit, offset } = options;
  const collaboratorsBuilder = getCollaboratorsBuilder().modify(
    (query: Knex.QueryBuilder) => {
      if (assignFilterUserId) {
        query.where({ [COLLABORATOR_ALIASES.userId]: assignFilterUserId });
      }
    }
  );
  const taskEvents: DetailTaskWithAssigneesEventRow[] = await getTaskViewBuilder(
    collaboratorsBuilder
  )
    .whereIn(ALIASES.designId, designIds)
    .modify((query: Knex.QueryBuilder) => {
      if (stageFilter) {
        query.where({ [ALIASES.stageTitle]: stageFilter });
      }
      if (assignFilterUserId) {
        query.havingRaw('json_array_length((:assigneesBuilder)) > 0', {
          assigneesBuilder: getAssigneesBuilder(collaboratorsBuilder)
        });
      }
    })
    .modify(limitOrOffset(limit, offset))
    .orderByRaw(VIEW_ORDERING);

  return validateEvery<
    DetailTaskWithAssigneesEventRow,
    DetailsTaskWithAssigneesAdaptedRow
  >(
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
  const taskEvents: DetailTaskWithAssigneesEventRow[] = await getTaskViewBuilder()
    .where({ [ALIASES.stageId]: stageId })
    .modify(limitOrOffset(limit, offset))
    .orderByRaw(VIEW_ORDERING);

  return validateEvery<
    DetailTaskWithAssigneesEventRow,
    DetailsTaskWithAssigneesAdaptedRow
  >(
    TABLE_NAME,
    isDetailTaskWithAssigneeRow,
    detailsWithAssigneesAdapter,
    taskEvents
  ).map(createDetailsTask);
}
