import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

export default interface AnnotationComment {
  commentId: string;
  annotationId: string;
}

export interface AnnotationCommentRow {
  comment_id: string;
  annotation_id: string;
}

export const dataAdapter = new DataAdapter<AnnotationCommentRow, AnnotationComment>();

export function isAnnotationCommentRow(row: object): row is AnnotationCommentRow {
  return hasProperties(
    row,
    'comment_id',
    'annotation_id'
  );
}
