import { Role } from "@cala/ts-lib/dist/users";
import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import Asset from "../assets/domain-object";

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
  userRole: Role;
  attachments: Asset[];
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
  user_role: Role;
  attachments: Asset[];
}

export const dataAdapter = new DataAdapter<CommentRow, Comment>();
export const baseDataAdapter = new DataAdapter<BaseCommentRow, BaseComment>();

export function isBaseComment(row: object): row is BaseComment {
  return hasProperties(
    row,
    "createdAt",
    "deletedAt",
    "id",
    "isPinned",
    "parentCommentId",
    "text",
    "userId"
  );
}

export function isCommentRow(row: object): row is CommentRow {
  return hasProperties(
    row,
    "id",
    "created_at",
    "deleted_at",
    "text",
    "parent_comment_id",
    "user_name",
    "user_email",
    "user_id",
    "user_role",
    "is_pinned"
  );
}

export function isComment(candidate: object): candidate is Comment {
  return hasProperties(
    candidate,
    "createdAt",
    "deletedAt",
    "id",
    "isPinned",
    "parentCommentId",
    "text",
    "userId",
    "userName",
    "userEmail",
    "userRole",
    "attachments"
  );
}

export const UPDATABLE_COLUMNS = ["is_pinned", "text"];

export const INSERTABLE_COLUMNS = [
  "id",
  "created_at",
  "is_pinned",
  "parent_comment_id",
  "text",
  "user_id",
];

export const BASE_COMMENT_PROPERTIES = [
  "createdAt",
  "deletedAt",
  "id",
  "isPinned",
  "parentCommentId",
  "text",
  "userId",
];
