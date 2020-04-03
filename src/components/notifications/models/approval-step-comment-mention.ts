import {
  BaseFullNotification,
  BaseFullNotificationRow,
  BaseNotification,
  BaseNotificationRow
} from './base';
import { NotificationType } from '../domain-object';

type BaseRow = Omit<
  BaseNotificationRow,
  | 'collection_id'
  | 'design_id'
  | 'approval_step_id'
  | 'comment_id'
  | 'recipient_user_id'
>;

export interface ApprovalStepCommentMentionNotificationRow extends BaseRow {
  collection_id: string;
  design_id: string;
  approval_step_id: string;
  comment_id: string;
  recipient_user_id: string;
  type: NotificationType.APPROVAL_STEP_COMMENT_MENTION;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & ApprovalStepCommentMentionNotificationRow,
  'collection_title' | 'comment_text' | 'design_title' | 'approval_step_title'
>;

export interface FullApprovalStepCommentMentionNotificationRow
  extends BaseFullRow {
  collection_title: string | null;
  comment_text: string;
  design_title: string | null;
  approval_step_title: string;
}

type Base = Omit<
  BaseNotification,
  | 'collectionId'
  | 'designId'
  | 'approvalStepId'
  | 'commentId'
  | 'recipientUserId'
>;

export interface ApprovalStepCommentMentionNotification extends Base {
  collectionId: string;
  designId: string;
  approvalStepId: string;
  commentId: string;
  recipientUserId: string;
  type: NotificationType.APPROVAL_STEP_COMMENT_MENTION;
}

type BaseFull = Omit<
  BaseFullNotification & ApprovalStepCommentMentionNotification,
  'collectionTitle' | 'commentText' | 'designTitle' | 'approvalStepTitle'
>;

export interface FullApprovalStepCommentMentionNotification extends BaseFull {
  collectionTitle: string | null;
  commentText: string;
  designTitle: string | null;
  approvalStepTitle: string;
}

export function isApprovalStepCommentMentionNotification(
  candidate: any
): candidate is ApprovalStepCommentMentionNotification {
  return candidate.type === NotificationType.APPROVAL_STEP_COMMENT_MENTION;
}
