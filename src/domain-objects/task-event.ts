import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

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

export interface TaskEventRequest {
  dueDate: Date | null;
  status: TaskStatus | null;
  title: string;
  description: string;
}

export default interface TaskEvent extends TaskEventRequest {
  createdBy: string;
  taskId: string;
  createdAt: Date;
  id: string;
}

export interface TaskResponse extends TaskEvent {
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

export interface TaskResponseRow {
  id: string;
  task_id: string;
  created_at: Date;
  created_by: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: Date | null;
  design_stage_id: string | null;
}

export const dataAdapter = new DataAdapter<TaskEventRow, TaskEvent>();
export const responseDataAdapter = new DataAdapter<TaskResponseRow, TaskResponse>();

export function isTaskEventRequest(candidate: object): candidate is TaskEventRequest {
  return hasProperties(
    candidate,
    'dueDate',
    'status',
    'title'
  );
}

export function isTaskEventRow(row: object): row is TaskEventRow {
  return hasProperties(
    row,
    'id',
    'task_id',
    'created_at',
    'created_by',
    'title',
    'status',
    'due_date'
  );
}

export function isTaskResponseRow(row: object): row is TaskResponseRow {
  return hasProperties(
    row,
    'id',
    'task_id',
    'created_at',
    'created_by',
    'title',
    'status',
    'due_date',
    'design_stage_id'
  );
}
