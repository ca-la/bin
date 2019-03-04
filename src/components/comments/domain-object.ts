import DataAdapter from '../../services/data-adapter';
import { hasOnlyProperties } from '../../services/require-properties';

/**
 * @typedef {object} Comment User comment
 *
 * @property {string} id Primary ID
 * @property {Date} createdAt Date when this record was created
 * @property {Date|null} deletedAt Date when this record was deleted
 * @property {string} text The comment body text
 * @property {string|null} parent_comment_id ID of the comment that is the parent of
 *   this comment
 * @property {string} user_id Comment author ID
 * @property {string|null} user_name Comment author name
 * @property {string} user_email Comment author email
 * @property {boolean} is_pinned Is this comment a pinned comment?
 */
export interface BaseComment {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
  text: string;
  parentCommentId: string | null;
  userId: string;
  isPinned: boolean;
}

export default interface Comment extends BaseComment {
  userName: string | null;
  userEmail: string | null;
}

export interface BaseCommentRow {
  id: string;
  created_at: Date;
  deleted_at: Date | null;
  text: string;
  parent_comment_id: string | null;
  user_id: string;
  is_pinned: boolean;
}

export interface CommentRow extends BaseCommentRow {
  user_name: string | null;
  user_email: string | null;
}

export const dataAdapter = new DataAdapter<CommentRow, Comment>();
export const baseDataAdapter = new DataAdapter<BaseCommentRow, BaseComment>();

export function isBaseComment(row: object): row is BaseComment {
  return hasOnlyProperties(
    row,
    'createdAt',
    'deletedAt',
    'id',
    'isPinned',
    'parentCommentId',
    'text',
    'userId'
  );
}

export function isCommentRow(row: object): row is CommentRow {
  return hasOnlyProperties(
    row,
    'id',
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

export function isComment(candidate: object): candidate is Comment {
  return hasOnlyProperties(
    candidate,
    'createdAt',
    'deletedAt',
    'id',
    'isPinned',
    'parentCommentId',
    'text',
    'userId',
    'userName',
    'userEmail'
  );
}

export const UPDATABLE_COLUMNS = [
  'is_pinned',
  'text'
];

export const INSERTABLE_COLUMNS = [
  'id',
  'created_at',
  'is_pinned',
  'parent_comment_id',
  'text',
  'user_id'
];

export const BASE_COMMENT_PROPERTIES = [
  'createdAt',
  'deletedAt',
  'id',
  'isPinned',
  'parentCommentId',
  'text',
  'userId'
];
