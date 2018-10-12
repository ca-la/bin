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
  createdBy: string;
  taskId: string;
  createdAt: Date;
  id: string;
  designStageId: string | null;
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
    'designStageId'
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
    'description'
  );
}

export interface TaskEventRowWithStage extends TaskEventRow {
  design_stage_id: string | null;
}

export function isTaskEventWithStage(candidate: object): candidate is TaskEventRowWithStage {
  return hasOnlyProperties(
    candidate,
    'id',
    'task_id',
    'created_at',
    'created_by',
    'title',
    'status',
    'due_date',
    'description',
    'design_stage_id'
  );
}

export const withStageAdapter = new DataAdapter<TaskEventRowWithStage, TaskEvent>();
