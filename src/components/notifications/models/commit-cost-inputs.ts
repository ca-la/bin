import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow,
} from "./base";
import { NotificationType } from "../domain-object";

type BaseRow = Omit<BaseNotificationRow, "collection_id">;

export interface CommitCostInputsNotificationRow extends BaseRow {
  collection_id: string;
  type: NotificationType.COMMIT_COST_INPUTS;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & CommitCostInputsNotificationRow,
  "collection_title"
>;

export interface FullCommitCostInputsNotificationRow extends BaseFullRow {
  collection_title: string | null;
}

type Base = Omit<BaseNotification, "collectionId">;

export interface CommitCostInputsNotification extends Base {
  collectionId: string;
  type: NotificationType.COMMIT_COST_INPUTS;
}

type BaseFull = Omit<
  BaseFullNotification & CommitCostInputsNotification,
  "collectionTitle"
>;

export interface FullCommitCostInputsNotification extends BaseFull {
  collectionTitle: string | null;
}

export function isCommitCostInputsNotification(
  candidate: any
): candidate is CommitCostInputsNotification {
  return candidate.type === NotificationType.COMMIT_COST_INPUTS;
}
