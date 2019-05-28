import { BaseNotification, BaseNotificationRow } from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<BaseNotificationRow, 'collection_id' | 'recipient_user_id'>;
export interface CollectionSubmitNotificationRow extends BaseRow {
  collection_id: string;
  recipient_user_id: string;
  type: NotificationType.COLLECTION_SUBMIT;
}
type Base = Omit<BaseNotification, 'collectionId' | 'recipientUserId'>;
export interface CollectionSubmitNotification extends Base {
  collectionId: string;
  recipientUserId: string;
  type: NotificationType.COLLECTION_SUBMIT;
}

export function isCollectionSubmitNotification(
  candidate: any
): candidate is CollectionSubmitNotification {
  return candidate.type === NotificationType.COLLECTION_SUBMIT;
}
