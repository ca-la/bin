import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow,
} from "./base";
import { NotificationType } from "../domain-object";

type BaseRow = Omit<
  BaseNotificationRow,
  | "collection_id"
  | "design_id"
  | "stage_id"
  | "task_id"
  | "comment_id"
  | "recipient_user_id"
>;

export interface TaskCommentMentionNotificationRow extends BaseRow {
  collection_id: string | null;
  design_id: string;
  stage_id: string;
  task_id: string;
  comment_id: string;
  recipient_user_id: string;
  type: NotificationType.TASK_COMMENT_MENTION;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & TaskCommentMentionNotificationRow,
  "collection_title" | "comment_text" | "design_title" | "task_title"
>;

export interface FullTaskCommentMentionNotificationRow extends BaseFullRow {
  collection_title: string | null;
  comment_text: string;
  design_title: string | null;
  task_title: string;
}

type Base = Omit<
  BaseNotification,
  | "collectionId"
  | "designId"
  | "stageId"
  | "taskId"
  | "commentId"
  | "recipientUserId"
>;

export interface TaskCommentMentionNotification extends Base {
  collectionId: string | null;
  designId: string;
  stageId: string;
  taskId: string;
  commentId: string;
  recipientUserId: string;
  type: NotificationType.TASK_COMMENT_MENTION;
}

type BaseFull = Omit<
  BaseFullNotification & TaskCommentMentionNotification,
  "collectionTitle" | "commentText" | "designTitle" | "taskTitle"
>;

export interface FullTaskCommentMentionNotification extends BaseFull {
  collectionTitle: string | null;
  commentText: string;
  designTitle: string | null;
  taskTitle: string;
}

export function isTaskCommentMentionNotification(
  candidate: any
): candidate is TaskCommentMentionNotification {
  return candidate.type === NotificationType.TASK_COMMENT_MENTION;
}
