import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * @typedef {object} TaskComment Comment that is associated with a task
 *
 * @property {string} commentId ID of associated comment
 * @property {string} taskId ID of associated account
 */
export default interface TaskComment {
  commentId: string;
  taskId: string;
}

export interface TaskCommentRow {
  comment_id: string;
  task_id: string;
}

export const dataAdapter = new DataAdapter<TaskCommentRow, TaskComment>();

export function isTaskCommentRow(row: object): row is TaskCommentRow {
  return hasProperties(
    row,
    'comment_id',
    'task_id'
  );
}
