import {
  BaseNotification,
  BaseNotificationRow
} from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  | 'collaborator_id'
  | 'collection_id'
  | 'design_id'
  | 'stage_id'
  | 'task_id'
  | 'recipient_user_id'
  >;
export interface TaskCompletionNotificationRow extends BaseRow {
  collaborator_id: string;
  collection_id: string | null;
  design_id: string;
  stage_id: string;
  task_id: string;
  recipient_user_id: string;
  type: NotificationType.TASK_COMPLETION;
}
type Base = Omit<
  BaseNotification,
  | 'collaboratorId'
  | 'collectionId'
  | 'designId'
  | 'stageId'
  | 'taskId'
  | 'recipientUserId'
  >;
export interface TaskCompletionNotification extends Base {
  collaboratorId: string;
  collectionId: string | null;
  designId: string;
  stageId: string;
  taskId: string;
  recipientUserId: string;
  type: NotificationType.TASK_COMPLETION;
}

export function isTaskCompletionNotification(
  candidate: any
): candidate is TaskCompletionNotification {
  return candidate.type === NotificationType.TASK_COMPLETION;
}
