import { BaseNotification, BaseNotificationRow } from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  | 'actor_user_id'
  | 'collection_id'
  | 'design_id'
  | 'collaborator_id'
  | 'sent_email_at'
  | 'recipient_user_id'
>;
export interface InviteCollaboratorNotificationRow extends BaseRow {
  actor_user_id: string;
  collection_id: string | null;
  design_id: string | null;
  collaborator_id: string;
  sent_email_at: string;
  recipient_user_id: string | null;
  type: NotificationType.INVITE_COLLABORATOR;
}
type Base = Omit<
  BaseNotification,
  | 'collectionId'
  | 'designId'
  | 'collaboratorId'
  | 'sentEmailAt'
  | 'recipientUserId'
>;
export interface InviteCollaboratorNotification extends Base {
  collectionId: string | null;
  designId: string | null;
  collaboratorId: string;
  sentEmailAt: Date;
  recipientUserId: string | null;
  type: NotificationType.INVITE_COLLABORATOR;
}

export function isInviteCollaboratorNotification(
  candidate: any
): candidate is InviteCollaboratorNotification {
  return candidate.type === NotificationType.INVITE_COLLABORATOR;
}
