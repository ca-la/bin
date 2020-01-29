import {
  BaseFullNotification,
  BaseFullNotificationRow,
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

type BaseFullRow = Omit<
  BaseFullNotificationRow & TaskCompletionNotificationRow,
  'collection_title' | 'design_title' | 'task_title'
>;

export interface FullTaskCompletionNotificationRow extends BaseFullRow {
  collection_title: string | null;
  design_title: string | null;
  task_title: string;
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

type BaseFull = Omit<
  BaseFullNotification & TaskCompletionNotification,
  'collectionTitle' | 'designTitle' | 'taskTitle'
>;

export interface FullTaskCompletionNotification extends BaseFull {
  collectionTitle: string | null;
  designTitle: string | null;
  taskTitle: string;
}

export function isTaskCompletionNotification(
  candidate: any
): candidate is TaskCompletionNotification {
  return candidate.type === NotificationType.TASK_COMPLETION;
}
