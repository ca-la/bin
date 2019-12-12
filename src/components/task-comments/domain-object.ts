import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';
import Comment, { CommentRow } from '../comments/domain-object';
import {
  CollaboratorMeta,
  CollaboratorMetaRow
} from '../collaborators/domain-objects/collaborator-meta';

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
  return hasProperties(row, 'comment_id', 'task_id');
}

export interface CommentWithCollaborator extends Comment {
  collaborators: CollaboratorMeta[];
}

export interface CommentWithCollaboratorRow extends CommentRow {
  collaborators: CollaboratorMetaRow[];
}

export const withCollaboratorDataAdapter = new DataAdapter<
  CommentWithCollaboratorRow,
  CommentWithCollaborator
>();

export function isCommentWithCollaboratorRow(
  row: object
): row is CommentWithCollaboratorRow {
  return hasProperties(
    row,
    'id',
    'collaborators',
    'created_at',
    'deleted_at',
    'text',
    'parent_comment_id',
    'user_name',
    'user_email',
    'user_id',
    'is_pinned'
  );
}
