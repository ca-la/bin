import {
  BaseNotification,
  BaseNotificationRow
} from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  | 'canvas_id'
  | 'collection_id'
  | 'design_id'
  | 'recipient_user_id'
  | 'annotation_id'
  >;
export interface AnnotationCreateNotificationRow extends BaseRow {
  canvas_id: string;
  collection_id: string | null;
  design_id: string;
  annotation_id: string;
  recipient_user_id: string;
  type: NotificationType.ANNOTATION_CREATE;
}
type Base = Omit<
  BaseNotification,
  'canvasId' | 'collectionId' | 'designId' | 'recipientUserId' | 'annotationId'
  >;
export interface AnnotationCreateNotification extends Base {
  canvasId: string;
  collectionId: string | null;
  designId: string;
  annotationId: string;
  recipientUserId: string;
  type: NotificationType.ANNOTATION_CREATE;
}

export function isAnnotationCreateNotification(
  candidate: any
): candidate is AnnotationCreateNotification {
  return candidate.type === NotificationType.ANNOTATION_CREATE;
}
