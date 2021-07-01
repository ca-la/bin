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
  | "approval_step_id"
  | "comment_id"
  | "recipient_user_id"
>;

export interface ApprovalStepCommentReplyNotificationRow extends BaseRow {
  collection_id: string | null;
  design_id: string;
  approval_step_id: string;
  comment_id: string;
  recipient_user_id: string;
  type: NotificationType.APPROVAL_STEP_COMMENT_REPLY;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & ApprovalStepCommentReplyNotificationRow,
  | "collection_title"
  | "comment_text"
  | "design_title"
  | "approval_step_title"
  | "parent_comment_id"
>;

export interface FullApprovalStepCommentReplyNotificationRow
  extends BaseFullRow {
  collection_title: string | null;
  comment_text: string;
  design_title: string | null;
  approval_step_title: string;
  parent_comment_id: string | null;
}

type Base = Omit<
  BaseNotification,
  | "collectionId"
  | "designId"
  | "approvalStepId"
  | "commentId"
  | "recipientUserId"
>;

export interface ApprovalStepCommentReplyNotification extends Base {
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  commentId: string;
  recipientUserId: string;
  type: NotificationType.APPROVAL_STEP_COMMENT_REPLY;
}

type BaseFull = Omit<
  BaseFullNotification & ApprovalStepCommentReplyNotification,
  | "collectionTitle"
  | "commentText"
  | "designTitle"
  | "approvalStepTitle"
  | "parentCommentId"
>;

export interface FullApprovalStepCommentReplyNotification extends BaseFull {
  collectionTitle: string | null;
  commentText: string;
  designTitle: string | null;
  approvalStepTitle: string;
  parentCommentId: string | null;
}

export function isApprovalStepCommentReplyNotification(
  candidate: any
): candidate is ApprovalStepCommentReplyNotification {
  return candidate.type === NotificationType.APPROVAL_STEP_COMMENT_REPLY;
}
