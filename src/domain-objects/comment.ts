import DataAdapter from '../services/data-adapter';
import { hasOnlyProperties } from '../services/require-properties';

/**
 * @typedef {object} Comment User comment
 *
 * @property {string} id Primary ID
 * @property {Date} createdAt Date when this record was created
 * @property {Date|null} deletedAt Date when this record was deleted
 * @property {string} text The comment body text
 * @property {string|null} parent_comment_id ID of the comment that is the parent of
 *   this comment
 * @property {string} user_id ID of the author of this comment
 * @property {boolean} is_pinned Is this comment a pinned comment?
 */
export default interface Comment {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
  text: string;
  parentCommentId: string | null;
  userId: string;
  isPinned: boolean;
}

export interface CommentRow {
  id: string;
  created_at: Date;
  deleted_at: Date | null;
  text: string;
  parent_comment_id: string | null;
  user_id: string;
  is_pinned: boolean;
}

export const dataAdapter = new DataAdapter<CommentRow, Comment>();

export function isCommentRow(row: object): row is CommentRow {
  return hasOnlyProperties(
    row,
    'id',
    'created_at',
    'deleted_at',
    'text',
    'parent_comment_id',
    'user_id',
    'is_pinned'
  );
}

export function isComment(candidate: object): candidate is Comment {
  return hasOnlyProperties(
    candidate,
    'createdAt',
    'deletedAt',
    'id',
    'isPinned',
    'parentCommentId',
    'text',
    'userId'
  );
}
