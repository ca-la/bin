import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow
} from './base';
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

type BaseFullRow = Omit<
  BaseFullNotificationRow & AnnotationCommentCreateNotificationRow,
  'collection_title' | 'comment_text' | 'design_title' | 'task_title'
>;

export interface FullAnnotationCommentCreateNotificationRow
  extends BaseFullRow {
  collection_title: string | null;
  comment_text: string;
  design_title: string | null;
  task_title: string;
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

type BaseFull = Omit<
  BaseFullNotification & AnnotationCommentCreateNotification,
  | 'collectionTitle'
  | 'commentText'
  | 'designTitle'
  | 'taskTitle'
  | 'componentType'
>;

export interface FullAnnotationCommentCreateNotification extends BaseFull {
  collectionTitle: string | null;
  commentText: string;
  componentType: string;
  designTitle: string | null;
  taskTitle: string;
}

export function isAnnotationCommentCreateNotification(
  candidate: any
): candidate is AnnotationCommentCreateNotification {
  return candidate.type === NotificationType.ANNOTATION_COMMENT_CREATE;
}
