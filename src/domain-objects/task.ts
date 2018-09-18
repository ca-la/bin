import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} TaskEvent A unit of work to be completed in the developement of a garment
 *
 * @property {string} id The primary id
 * @property {Date} createdAt The date the row was created
 */

export default interface Task {
  id: string;
  createdAt: Date;
}

export interface TaskRow {
  id: string;
  created_at: Date;
}

export const dataAdapter = new DataAdapter<TaskRow, Task>();

export function isTaskRow(row: object): row is TaskRow {
  return hasProperties(
    row,
    'id',
    'created_at'
  );
}
