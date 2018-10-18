import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} UserTask A joining row between users and tasks
 *
 * @property {string} id The primary id
 * @property {string} userId The id of the user (AKA assignee)
 * @property {string} taskId The id of the task
 * @property {Date} createdAt Date when this record was created
 */

export default interface UserTask {
  createdAt: Date;
  id: string;
  taskId: string;
  userId: string;
}

export interface UserTaskRow {
  created_at: Date;
  id: string;
  task_id: string;
  user_id: string;
}

export const dataAdapter = new DataAdapter<UserTaskRow, UserTask>();

export function isUserTaskRow(row: object): row is UserTaskRow {
  return hasProperties(
    row,
    'created_at',
    'id',
    'task_id',
    'user_id'
  );
}
