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
  isTaskEventRow,
  TaskEventRow,
  TaskStatus
} from '../../domain-objects/task-event';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import { findAllDesignIdsThroughCollaborator } from '../../components/product-designs/dao/dao';
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
const VIEW_ORDERING =
  'design_created_at desc, design_stage_ordering asc, ordering asc';

export async function create(
  data: Unsaved<TaskEvent>,
  trx?: Knex.Transaction
): Promise<TaskEvent> {
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

  return validate<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    created
  );
}

export async function createAll(
  data: Unsaved<TaskEvent>[],
  trx?: Knex.Transaction
): Promise<TaskEvent[]> {
  if (data.length === 0) {
    return [];
  }

  const rowData = data.map((unsavedTask: Unsaved<TaskEvent>) =>
    dataAdapter.forInsertion({
      ...omit(unsavedTask, 'designStageId'),
      id: uuid.v4(),
      status: unsavedTask.status || TaskStatus.NOT_STARTED
    })
  );

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    created
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<DetailsTaskWithAssignees | null> {
  const taskEvent:
    | DetailTaskWithAssigneesEventRow
    | undefined = await getTaskViewBuilder()
    .where({ [ALIASES.taskId]: id })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
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

export async function findRawById(id: string): Promise<TaskEvent | null> {
  const taskEvent: TaskEventRow | undefined = await db(TABLE_NAME)
    .where({ task_id: id })
    .limit(1)
    .orderBy('created_at', 'desc')
    .then((rows: TaskEventRow[]) => first<TaskEventRow>(rows));

  if (!taskEvent) {
    return null;
  }

  return validate<TaskEventRow, TaskEvent>(
    TABLE_NAME,
    isTaskEventRow,
    dataAdapter,
    taskEvent
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

export type TaskFilter =
  | { type: 'STATUS'; value: 'COMPLETED' | 'INCOMPLETE' }
  | { type: 'DESIGN'; value: string }
  | { type: 'COLLECTION'; value: '*' | string }
  | { type: 'STAGE'; value: string };

export interface TasksListOptions {
  assignFilterUserId?: string;
  filters?: TaskFilter[];
  limit?: number;
  offset?: number;
}

export async function findByUserId(
  userId: string,
  options: TasksListOptions = {}
): Promise<DetailsTaskWithAssignees[]> {
  const designIds = await findAllDesignIdsThroughCollaborator(userId);
  const { assignFilterUserId, filters, limit, offset } = options;
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
      if (assignFilterUserId) {
        query.havingRaw('json_array_length((:assigneesBuilder)) > 0', {
          assigneesBuilder: getAssigneesBuilder(collaboratorsBuilder)
        });
      }
      if (filters && filters.length > 0) {
        filters.forEach(
          (taskFilter: TaskFilter): void => applyFilter(taskFilter, query)
        );
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

function applyFilter(taskFilter: TaskFilter, query: Knex.QueryBuilder): void {
  switch (taskFilter.type) {
    case 'STATUS': {
      if (taskFilter.value === 'COMPLETED') {
        query.where(ALIASES.taskStatus, TaskStatus.COMPLETED);
      }
      if (taskFilter.value === 'INCOMPLETE') {
        query.whereNot(ALIASES.taskStatus, TaskStatus.COMPLETED);
      }
      break;
    }
    case 'DESIGN': {
      query.where(ALIASES.designId, taskFilter.value);
      break;
    }
    case 'COLLECTION': {
      if (taskFilter.value === '*') {
        query.whereNotNull(ALIASES.collectionId);
      } else {
        query.where(ALIASES.collectionId, taskFilter.value);
      }
      break;
    }
    case 'STAGE': {
      query.whereIn(ALIASES.stageTitle, taskFilter.value.split(','));
      break;
    }
  }
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
