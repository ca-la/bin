import {
  BaseNotification,
  BaseNotificationRow
} from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  | 'collection_id'
  | 'design_id'
  | 'stage_id'
  | 'task_id'
  | 'comment_id'
  | 'recipient_user_id'
  >;
export interface TaskCommentCreateNotificationRow extends BaseRow {
  collection_id: string | null;
  design_id: string;
  stage_id: string;
  task_id: string;
  comment_id: string;
  recipient_user_id: string;
  type: NotificationType.TASK_COMMENT_CREATE;
}
type Base = Omit<
  BaseNotification,
  | 'collectionId'
  | 'designId'
  | 'stageId'
  | 'taskId'
  | 'commentId'
  | 'recipientUserId'
  >;
export interface TaskCommentCreateNotification extends Base {
  collectionId: string | null;
  designId: string;
  stageId: string;
  taskId: string;
  commentId: string;
  recipientUserId: string;
  type: NotificationType.TASK_COMMENT_CREATE;
}

export function isTaskCommentCreateNotification(
  candidate: any
): candidate is TaskCommentCreateNotification {
  return candidate.type === NotificationType.TASK_COMMENT_CREATE;
}
