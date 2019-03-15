import {
  BaseNotification,
  BaseNotificationRow
} from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  | 'design_id'
  | 'recipient_user_id'
  >;
export interface PartnerDesignBidNotificationRow extends BaseRow {
  design_id: string;
  recipient_user_id: string;
  type: NotificationType.PARTNER_DESIGN_BID;
}
type Base = Omit<
  BaseNotification,
  'designId' | 'recipientUserId'
  >;
export interface PartnerDesignBidNotification extends Base {
  designId: string;
  recipientUserId: string;
  type: NotificationType.PARTNER_DESIGN_BID;
}

export function isPartnerDesignBidNotification(
  candidate: any
): candidate is PartnerDesignBidNotification {
  return candidate.type === NotificationType.PARTNER_DESIGN_BID;
}
