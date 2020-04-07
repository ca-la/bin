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

export interface ApprovalStepCommentCreateNotificationRow extends BaseRow {
  collection_id: string | null;
  design_id: string;
  approval_step_id: string;
  comment_id: string;
  recipient_user_id: string;
  type: NotificationType.APPROVAL_STEP_COMMENT_CREATE;
}

type BaseFullRow = Omit<
  BaseFullNotificationRow & ApprovalStepCommentCreateNotificationRow,
  'collection_title' | 'comment_text' | 'design_title' | 'approval_step_title'
>;

export interface FullApprovalStepCommentCreateNotificationRow
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

export interface ApprovalStepCommentCreateNotification extends Base {
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  commentId: string;
  recipientUserId: string;
  type: NotificationType.APPROVAL_STEP_COMMENT_CREATE;
}

type BaseFull = Omit<
  BaseFullNotification & ApprovalStepCommentCreateNotification,
  'collectionTitle' | 'commentText' | 'designTitle' | 'approvalStepTitle'
>;

export interface FullApprovalStepCommentCreateNotification extends BaseFull {
  collectionTitle: string | null;
  commentText: string;
  designTitle: string | null;
  approvalStepTitle: string;
}

export function isApprovalStepCommentCreateNotification(
  candidate: any
): candidate is ApprovalStepCommentCreateNotification {
  return candidate.type === NotificationType.APPROVAL_STEP_COMMENT_CREATE;
}
