import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import {
  isCommentRow,
  dataAdapter as commentDataAdapter,
} from "../comments/domain-object";
import Comment, { CommentRow } from "../comments/types";

export default interface AnnotationComment {
  commentId: string;
  annotationId: string;
}

export interface AnnotationCommentRow {
  comment_id: string;
  annotation_id: string;
}

export const dataAdapter = new DataAdapter<
  AnnotationCommentRow,
  AnnotationComment
>();

export function isAnnotationCommentRow(
  row: object
): row is AnnotationCommentRow {
  return hasProperties(row, "comment_id", "annotation_id");
}

export interface CommentWithMeta extends Comment {
  annotationId: string;
  replyCount: number;
}

export interface CommentWithMetaRow extends CommentRow {
  annotation_id: string;
  reply_count: number;
}

export function encode(row: CommentWithMetaRow): CommentWithMeta {
  return {
    ...commentDataAdapter.parse(row),
    annotationId: row.annotation_id,
  };
}

export function decode(data: CommentWithMeta): CommentWithMetaRow {
  return {
    ...commentDataAdapter.toDb(data),
    annotation_id: data.annotationId,
  };
}

export const withMetaDataAdapter = new DataAdapter<
  CommentWithMetaRow,
  CommentWithMeta
>(encode, decode);

export function isCommentWithMetaRow(row: object): row is CommentWithMetaRow {
  return (
    isCommentRow(row) && hasProperties(row, "annotation_id", "reply_count")
  );
}
