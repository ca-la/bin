import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow,
} from "./base";
import { NotificationType } from "../domain-object";

type BaseRow = Omit<BaseNotificationRow, "design_id" | "recipient_user_id">;

export interface PartnerDesignBidNotificationRow extends BaseRow {
  design_id: string;
  recipient_user_id: string;
  type: NotificationType.PARTNER_DESIGN_BID;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & PartnerDesignBidNotificationRow,
  "design_title"
>;

export interface FullPartnerDesignBidNotificationRow extends BaseFullRow {
  design_title: string | null;
}

type Base = Omit<BaseNotification, "designId" | "recipientUserId">;

export interface PartnerDesignBidNotification extends Base {
  designId: string;
  recipientUserId: string;
  type: NotificationType.PARTNER_DESIGN_BID;
}

type BaseFull = Omit<
  BaseFullNotification & PartnerDesignBidNotification,
  "designTitle"
>;

export interface FullPartnerDesignBidNotification extends BaseFull {
  designTitle: string | null;
}

export function isPartnerDesignBidNotification(
  candidate: any
): candidate is PartnerDesignBidNotification {
  return candidate.type === NotificationType.PARTNER_DESIGN_BID;
}
