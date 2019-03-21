import { BaseNotification, BaseNotificationRow } from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  | 'canvas_id'
  | 'collection_id'
  | 'comment_id'
  | 'design_id'
  | 'recipient_user_id'
  | 'annotation_id'
>;
export interface AnnotationCommentCreateNotificationRow extends BaseRow {
  canvas_id: string;
  collection_id: string | null;
  comment_id: string;
  design_id: string;
  annotation_id: string;
  recipient_user_id: string;
  type: NotificationType.ANNOTATION_COMMENT_CREATE;
}
type Base = Omit<
  BaseNotification,
  | 'canvasId'
  | 'collectionId'
  | 'commentId'
  | 'designId'
  | 'recipientUserId'
  | 'annotationId'
>;
export interface AnnotationCommentCreateNotification extends Base {
  canvasId: string;
  collectionId: string | null;
  commentId: string;
  designId: string;
  annotationId: string;
  recipientUserId: string;
  type: NotificationType.ANNOTATION_COMMENT_CREATE;
}

export function isAnnotationCommentCreateNotification(
  candidate: any
): candidate is AnnotationCommentCreateNotification {
  return candidate.type === NotificationType.ANNOTATION_COMMENT_CREATE;
}
