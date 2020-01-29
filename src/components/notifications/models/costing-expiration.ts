import {
  BaseFullNotification,
  BaseNotification,
  BaseNotificationRow
} from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<BaseNotificationRow, 'collection_id' | 'recipient_user_id'>;
type Base = Omit<BaseNotification, 'collectionId' | 'recipientUserId'>;

export type ExpirationNotification =
  | NotificationType.COSTING_EXPIRATION_ONE_WEEK
  | NotificationType.COSTING_EXPIRATION_TWO_DAYS
  | NotificationType.COSTING_EXPIRED;

// One Week Expiration

export interface OneWeekExpirationNotificationRow extends BaseRow {
  collection_id: string;
  recipient_user_id: string;
  type: NotificationType.COSTING_EXPIRATION_ONE_WEEK;
}

export interface OneWeekExpirationNotification extends Base {
  collectionId: string;
  recipientUserId: string;
  type: NotificationType.COSTING_EXPIRATION_ONE_WEEK;
}

export function isOneWeekExpirationNotification(
  candidate: any
): candidate is OneWeekExpirationNotification {
  return candidate.type === NotificationType.COSTING_EXPIRATION_ONE_WEEK;
}

// Two Day Expiration

export interface TwoDayExpirationNotificationRow extends BaseRow {
  collection_id: string;
  recipient_user_id: string;
  type: NotificationType.COSTING_EXPIRATION_TWO_DAYS;
}

export interface TwoDayExpirationNotification extends Base {
  collectionId: string;
  recipientUserId: string;
  type: NotificationType.COSTING_EXPIRATION_TWO_DAYS;
}

export function isTwoDayExpirationNotification(
  candidate: any
): candidate is TwoDayExpirationNotification {
  return candidate.type === NotificationType.COSTING_EXPIRATION_TWO_DAYS;
}

// Expired

export interface ExpiredNotificationRow extends BaseRow {
  collection_id: string;
  recipient_user_id: string;
  type: NotificationType.COSTING_EXPIRED;
}

export interface ExpiredNotification extends Base {
  collectionId: string;
  recipientUserId: string;
  type: NotificationType.COSTING_EXPIRED;
}

export function isExpiredNotification(
  candidate: any
): candidate is ExpiredNotification {
  return candidate.type === NotificationType.COSTING_EXPIRED;
}

type BaseFull = Omit<
  BaseFullNotification & ExpiredNotification,
  'type' | 'collectionTitle'
>;

export interface FullExpirationNotification extends BaseFull {
  type:
    | NotificationType.COSTING_EXPIRATION_ONE_WEEK
    | NotificationType.COSTING_EXPIRATION_TWO_DAYS
    | NotificationType.COSTING_EXPIRED;
  collectionTitle: string;
}
