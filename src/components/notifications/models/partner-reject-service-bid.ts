import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow,
} from "./base";
import { NotificationType } from "../domain-object";

type BaseRow = Omit<BaseNotificationRow, "design_id" | "recipient_user_id">;

export interface PartnerRejectServiceBidNotificationRow extends BaseRow {
  design_id: string;
  recipient_user_id: string;
  type: NotificationType.PARTNER_REJECT_SERVICE_BID;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & PartnerRejectServiceBidNotificationRow,
  "design_title"
>;

export interface FullPartnerRejectServiceBidNotificationRow
  extends BaseFullRow {
  design_title: string | null;
}

type Base = Omit<BaseNotification, "designId" | "recipientUserId">;

export interface PartnerRejectServiceBidNotification extends Base {
  designId: string;
  recipientUserId: string;
  type: NotificationType.PARTNER_REJECT_SERVICE_BID;
}

type BaseFull = Omit<
  BaseFullNotification & PartnerRejectServiceBidNotification,
  "designTitle"
>;

export interface FullPartnerRejectServiceBidNotification extends BaseFull {
  designTitle: string | null;
}

export function isPartnerRejectServiceBidNotification(
  candidate: any
): candidate is PartnerRejectServiceBidNotification {
  return candidate.type === NotificationType.PARTNER_REJECT_SERVICE_BID;
}
