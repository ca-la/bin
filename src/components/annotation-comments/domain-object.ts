import DataAdapter from '../../services/data-adapter';
import {
  hasOnlyProperties,
  hasProperties
} from '../../services/require-properties';
import Comment, { CommentRow } from '../comments/domain-object';

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
  return hasProperties(row, 'comment_id', 'annotation_id');
}

export interface CommentWithMeta extends Comment {
  annotationId: string;
}

export interface CommentWithMetaRow extends CommentRow {
  annotation_id: string;
}

export const withMetaDataAdapter = new DataAdapter<
  CommentWithMetaRow,
  CommentWithMeta
>();

export function isCommentWithMetaRow(row: object): row is CommentWithMetaRow {
  return hasOnlyProperties(
    row,
    'id',
    'annotation_id',
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
