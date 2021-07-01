import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow,
} from "./base";
import { NotificationType } from "../domain-object";

type BaseRow = Omit<
  BaseNotificationRow,
  | "canvas_id"
  | "collection_id"
  | "comment_id"
  | "design_id"
  | "recipient_user_id"
  | "annotation_id"
>;

export interface AnnotationCommentReplyNotificationRow extends BaseRow {
  canvas_id: string;
  collection_id: string | null;
  comment_id: string;
  design_id: string;
  annotation_id: string;
  recipient_user_id: string;
  type: NotificationType.ANNOTATION_COMMENT_REPLY;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & AnnotationCommentReplyNotificationRow,
  | "collection_title"
  | "comment_text"
  | "design_title"
  | "task_title"
  | "parent_comment_id"
>;

export interface FullAnnotationCommentReplyNotificationRow extends BaseFullRow {
  collection_title: string | null;
  comment_text: string;
  design_title: string | null;
  task_title: string;
  parent_comment_id: string | null;
}

type Base = Omit<
  BaseNotification,
  | "canvasId"
  | "collectionId"
  | "commentId"
  | "designId"
  | "recipientUserId"
  | "annotationId"
>;

export interface AnnotationCommentReplyNotification extends Base {
  canvasId: string;
  collectionId: string | null;
  commentId: string;
  designId: string;
  annotationId: string;
  recipientUserId: string;
  type: NotificationType.ANNOTATION_COMMENT_REPLY;
}

type BaseFull = Omit<
  BaseFullNotification & AnnotationCommentReplyNotification,
  | "collectionTitle"
  | "commentText"
  | "designTitle"
  | "taskTitle"
  | "componentType"
  | "parentCommentId"
>;

export interface FullAnnotationCommentReplyNotification extends BaseFull {
  collectionTitle: string | null;
  commentText: string;
  designTitle: string | null;
  taskTitle: string;
  componentType: string;
  parentCommentId: string | null;
}

export function isAnnotationCommentReplyNotification(
  candidate: any
): candidate is AnnotationCommentReplyNotification {
  return candidate.type === NotificationType.ANNOTATION_COMMENT_REPLY;
}
