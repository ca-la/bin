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
export interface TaskAssigmentNotificationRow extends BaseRow {
  collaborator_id: string;
  collection_id: string | null;
  design_id: string;
  stage_id: string;
  task_id: string;
  recipient_user_id: string;
  type: NotificationType.TASK_ASSIGNMENT;
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
export interface TaskAssigmentNotification extends Base {
  collaboratorId: string;
  collectionId: string | null;
  designId: string;
  stageId: string;
  taskId: string;
  recipientUserId: string;
  type: NotificationType.TASK_ASSIGNMENT;
}

export function isTaskAssigmentNotification(
  candidate: any
): candidate is TaskAssigmentNotification {
  return candidate.type === NotificationType.TASK_ASSIGNMENT;
}
