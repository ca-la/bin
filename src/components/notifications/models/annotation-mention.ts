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

export interface AnnotationCommentMentionNotificationRow extends BaseRow {
  canvas_id: string;
  collection_id: string | null;
  comment_id: string;
  design_id: string;
  annotation_id: string;
  recipient_user_id: string;
  type: NotificationType.ANNOTATION_COMMENT_MENTION;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & AnnotationCommentMentionNotificationRow,
  | "collection_title"
  | "comment_text"
  | "design_title"
  | "task_title"
  | "annotation_image_id"
  | "annotation_image_page_number"
  | "parent_comment_id"
>;

export interface FullAnnotationCommentMentionNotificationRow
  extends BaseFullRow {
  collection_title: string | null;
  comment_text: string;
  design_title: string | null;
  task_title: string;
  annotation_image_id: string;
  annotation_image_page_number: number | null;
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

export interface AnnotationCommentMentionNotification extends Base {
  canvasId: string;
  collectionId: string | null;
  commentId: string;
  designId: string;
  annotationId: string;
  recipientUserId: string;
  type: NotificationType.ANNOTATION_COMMENT_MENTION;
}

type BaseFull = Omit<
  BaseFullNotification & AnnotationCommentMentionNotification,
  | "collectionTitle"
  | "commentText"
  | "designTitle"
  | "taskTitle"
  | "annotationImageId"
  | "annotationImagePageNumber"
  | "componentType"
  | "parentCommentId"
>;

export interface FullAnnotationCommentMentionNotification extends BaseFull {
  collectionTitle: string | null;
  commentText: string;
  designTitle: string | null;
  taskTitle: string;
  annotationImageId: string;
  annotationImagePageNumber: number | null;
  componentType: string;
  parentCommentId: string | null;
}

export function isAnnotationCommentMentionNotification(
  candidate: any
): candidate is AnnotationCommentMentionNotification {
  return candidate.type === NotificationType.ANNOTATION_COMMENT_MENTION;
}
