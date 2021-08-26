import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow,
} from "./base";
import { NotificationType } from "../domain-object";

type BaseRow = Omit<BaseNotificationRow, "collection_id">;

export interface RejectCollectionNotificationRow extends BaseRow {
  collection_id: string;
  type: NotificationType.REJECT_COLLECTION;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & RejectCollectionNotificationRow,
  "collection_title"
>;

export interface FullRejectCollectionNotificationRow extends BaseFullRow {
  collection_title: string | null;
}

type Base = Omit<BaseNotification, "collectionId">;

export interface RejectCollectionNotification extends Base {
  collectionId: string;
  type: NotificationType.REJECT_COLLECTION;
}

type BaseFull = Omit<
  BaseFullNotification & RejectCollectionNotification,
  "collectionTitle"
>;

export interface FullRejectCollectionNotification extends BaseFull {
  collectionTitle: string | null;
}

export function isRejectCollectionNotification(
  candidate: any
): candidate is RejectCollectionNotification {
  return candidate.type === NotificationType.REJECT_COLLECTION;
}
