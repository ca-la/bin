import { BaseNotification, BaseNotificationRow } from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  'collection_id' | 'sent_email_at' | 'recipient_user_id'
>;
export interface PartnerPairingCommittedNotificationRow extends BaseRow {
  collection_id: string;
  sent_email_at: string;
  recipient_user_id: string;
  type: NotificationType.PARTNER_PAIRING_COMMITTED;
}
type Base = Omit<
  BaseNotification,
  'collectionId' | 'sentEmailAt' | 'recipientUserId'
>;
export interface PartnerPairingCommittedNotification extends Base {
  collectionId: string;
  sentEmailAt: Date;
  recipientUserId: string;
  type: NotificationType.PARTNER_PAIRING_COMMITTED;
}

export function isPartnerPairingCommittedNotification(
  candidate: any
): candidate is PartnerPairingCommittedNotification {
  return candidate.type === NotificationType.PARTNER_PAIRING_COMMITTED;
}
