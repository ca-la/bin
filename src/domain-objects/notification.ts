import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

export enum NotificationType {
  DESIGN_UPDATE = 'DESIGN_UPDATE',
  SECTION_DELETE = 'SECTION_DELETE',
  SECTION_CREATE = 'SECTION_CREATE',
  SECTION_UPDATE = 'SECTION_UPDATE',
  TASK_ASSIGNMENT = 'TASK_ASSIGNMENT',
  TASK_COMMENT_CREATE = 'TASK_COMMENT_CREATE',
  TASK_COMPLETION = 'TASK_COMPLETION',
  PARTNER_ACCEPT_SERVICE_BID = 'PARTNER_ACCEPT_SERVICE_BID',
  PARTNER_REJECT_SERVICE_BID = 'PARTNER_REJECT_SERVICE_BID',
  COLLECTION_SUBMIT = 'COLLECTION_SUBMIT',
  COMMIT_COST_INPUTS = 'COMMIT_COST_INPUTS',
  PARTNER_DESIGN_BID = 'PARTNER_DESIGN_BID',
  INVITE_COLLABORATOR = 'INVITE_COLLABORATOR'
}

export default interface Notification {
  // DEPRECATED
  actionDescription: string | null;
  actorUserId: string;
  collaboratorId: string | null;
  collectionId: string | null;
  commentId: string | null;
  createdAt: Date;
  designId: string | null;
  id: string;
  recipientUserId: string | null;
  // DEPRECATED
  sectionId: string | null;
  sentEmailAt: Date | null;
  stageId: string | null;
  taskId: string | null;
  type: NotificationType | null;
}

export interface NotificationRow {
  // DEPRECATED
  action_description: string | null;
  actor_user_id: string;
  collaborator_id: string | null;
  collection_id: string | null;
  comment_id: string | null;
  created_at: Date;
  design_id: string | null;
  id: string;
  recipient_user_id: string | null;
  // DEPRECATED
  section_id: string | null;
  sent_email_at: Date | null;
  stage_id: string | null;
  task_id: string | null;
  type: NotificationType | null;
}

export const dataAdapter = new DataAdapter<
  NotificationRow,
  Notification
>();

export function isNotificationRow(row: object):
  row is NotificationRow {
  return hasProperties(
    row,
    'action_description',
    'actor_user_id',
    'collaborator_id',
    'collection_id',
    'comment_id',
    'created_at',
    'design_id',
    'id',
    'recipient_user_id',
    'section_id',
    'sent_email_at',
    'stage_id',
    'task_id',
    'type'
  );
}
