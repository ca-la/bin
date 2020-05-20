import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow,
} from "./base";
import { NotificationType } from "../domain-object";

type BaseRow = Omit<BaseNotificationRow, "design_id" | "recipient_user_id">;

export interface PartnerAcceptServiceBidNotificationRow extends BaseRow {
  design_id: string;
  recipient_user_id: string;
  type: NotificationType.PARTNER_ACCEPT_SERVICE_BID;
}

type Base = Omit<BaseNotification, "designId" | "recipientUserId">;

type BaseFullRow = Omit<
  BaseFullNotificationRow & PartnerAcceptServiceBidNotificationRow,
  "design_title"
>;

export interface FullPartnerAcceptServiceBidNotificationRow
  extends BaseFullRow {
  design_title: string | null;
}

export interface PartnerAcceptServiceBidNotification extends Base {
  designId: string;
  recipientUserId: string;
  type: NotificationType.PARTNER_ACCEPT_SERVICE_BID;
}

type BaseFull = Omit<
  BaseFullNotification & PartnerAcceptServiceBidNotification,
  "designTitle"
>;

export interface FullPartnerAcceptServiceBidNotification extends BaseFull {
  designTitle: string | null;
}

export function isPartnerAcceptServiceBidNotification(
  candidate: any
): candidate is PartnerAcceptServiceBidNotification {
  return candidate.type === NotificationType.PARTNER_ACCEPT_SERVICE_BID;
}
