import DataAdapter from '../services/data-adapter';
import { hasOnlyProperties } from '../services/require-properties';

/**
 * @typedef {object} TaskEvent A unit of work to be completed in the developement of a garment
 *
 * @property {string} id The unique row id
 * @property {string} taskId The id of the task
 * @property {Date} createdAt Date when this record was created
 * @property {string} createdBy The userId of the person who created the record
 * @property {string} title The task title
 * @property {TaskEventState} status The current status of the task
 * @property {Date} dueDate The current status of the task
 */
export default interface TaskEvent {
  dueDate: Date | null;
  status: TaskStatus | null;
  title: string;
  description: string;
  createdBy: string | null;
  taskId: string;
  createdAt: Date;
  id: string;
  designStageId: string | null;
  ordering: number;
}

export interface RelatedResourceMeta {
  id: string | null;
  title: string | null;
}

export interface DetailsTaskAdaptedRow extends Omit<TaskEvent, 'taskId'> {
  designStageTitle: string | null;
  designId: string | null;
  designTitle: string | null;
  collectionId: string | null;
  collectionTitle: string | null;
}

export const createDetailsTask = (data: DetailsTaskAdaptedRow): DetailsTask => {
  const {
    designId,
    designTitle,
    designStageId,
    designStageTitle,
    collectionId,
    collectionTitle,
    ...task
  } = data;
  return {
    ...task,
    collection: {
      id: collectionId,
      title: collectionTitle
    },
    design: {
      id: designId,
      title: designTitle
    },
    designStage: {
      id: designStageId,
      title: designStageTitle
    },
    designStageId
  };
};

export interface DetailsTask extends Omit<TaskEvent, 'taskId'> {
  designStage: RelatedResourceMeta;
  design: RelatedResourceMeta;
  collection: RelatedResourceMeta;
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELETED = 'DELETED'
}

export interface TaskEventRow {
  id: string;
  task_id: string;
  created_at: Date;
  created_by: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: Date | null;
  ordering: number;
}

export const dataAdapter = new DataAdapter<TaskEventRow, TaskEvent>();

export function isTaskEvent(candidate: object): candidate is TaskEvent {
  return hasOnlyProperties(
    candidate,
    'id',
    'taskId',
    'createdAt',
    'createdBy',
    'title',
    'status',
    'dueDate',
    'description',
    'designStageId',
    'ordering'
  );
}

export function isTaskEventRow(row: object): row is TaskEventRow {
  return hasOnlyProperties(
    row,
    'id',
    'task_id',
    'created_at',
    'created_by',
    'title',
    'status',
    'due_date',
    'description',
    'ordering'
  );
}

export interface DetailTaskEventRow extends TaskEventRow {
  design_stage_id: string | null;
  design_stage_title: string | null;
  design_id: string | null;
  design_title: string | null;
  collection_id: string | null;
  collection_title: string | null;
}

export function isDetailTaskRow(
  candidate: object
): candidate is DetailTaskEventRow {
  return hasOnlyProperties(
    candidate,
    'id',
    'created_at',
    'created_by',
    'title',
    'status',
    'due_date',
    'description',
    'design_stage_id',
    'design_stage_title',
    'design_id',
    'design_title',
    'collection_id',
    'collection_title',
    'ordering'
  );
}

export const detailsAdapter = new DataAdapter<DetailTaskEventRow, DetailsTaskAdaptedRow>();
