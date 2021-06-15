import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import { toData } from "../assets/domain-object";
import Comment, { CommentRow, BaseCommentRow, BaseComment } from "./types";

export const baseDataAdapter = new DataAdapter<BaseCommentRow, BaseComment>();

function encode(row: CommentRow): Comment {
  return {
    ...baseDataAdapter.parse(row),
    replyCount: Number(row.reply_count),
    userEmail: row.user_email,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    attachments: row.attachments.map(toData),
  };
}

export const dataAdapter = new DataAdapter<CommentRow, Comment>(encode);

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
  "deleted_at",
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
