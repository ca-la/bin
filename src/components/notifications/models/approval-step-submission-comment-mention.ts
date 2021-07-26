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
  | "approval_submission_id"
  | "comment_id"
  | "recipient_user_id"
>;

export interface ApprovalStepSubmissionCommentMentionNotificationRow
  extends BaseRow {
  collection_id: string | null;
  design_id: string;
  approval_step_id: string;
  approval_submission_id: string;
  comment_id: string;
  recipient_user_id: string;
  type: NotificationType.APPROVAL_STEP_COMMENT_MENTION;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & ApprovalStepSubmissionCommentMentionNotificationRow,
  | "collection_title"
  | "comment_text"
  | "design_title"
  | "approval_step_title"
  | "approval_submission_title"
  | "parent_comment_id"
>;

export interface FullApprovalStepSubmissionCommentMentionNotificationRow
  extends BaseFullRow {
  collection_title: string | null;
  comment_text: string;
  design_title: string | null;
  approval_step_title: string;
  approval_submission_title: string;
  parent_comment_id: string | null;
}

type Base = Omit<
  BaseNotification,
  | "collectionId"
  | "designId"
  | "approvalStepId"
  | "approvalSubmissionId"
  | "commentId"
  | "recipientUserId"
>;

export interface ApprovalStepSubmissionCommentMentionNotification extends Base {
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  approvalSubmissionId: string;
  commentId: string;
  recipientUserId: string;
  type: NotificationType.APPROVAL_STEP_SUBMISSION_COMMENT_MENTION;
}

type BaseFull = Omit<
  BaseFullNotification & ApprovalStepSubmissionCommentMentionNotification,
  | "collectionTitle"
  | "commentText"
  | "designTitle"
  | "approvalStepTitle"
  | "approvalSubmissionTitle"
  | "parentCommentId"
>;

export interface FullApprovalStepSubmissionCommentMentionNotification
  extends BaseFull {
  collectionTitle: string | null;
  commentText: string;
  designTitle: string | null;
  approvalStepTitle: string;
  approvalSubmissionTitle: string;
  parentCommentId: string | null;
}

export function isApprovalStepSubmissionCommentMentionNotification(
  candidate: any
): candidate is ApprovalStepSubmissionCommentMentionNotification {
  return (
    candidate.type === NotificationType.APPROVAL_STEP_SUBMISSION_COMMENT_MENTION
  );
}
