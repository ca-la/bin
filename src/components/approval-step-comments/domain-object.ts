import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';
import Comment, { CommentRow, isCommentRow } from '../comments/domain-object';

export default interface ApprovalStepComment {
  commentId: string;
  approvalStepId: string;
}

export interface ApprovalStepCommentRow {
  comment_id: string;
  approval_step_id: string;
}

export const dataAdapter = new DataAdapter<
  ApprovalStepCommentRow,
  ApprovalStepComment
>();

export function isApprovalStepCommentRow(
  row: object
): row is ApprovalStepCommentRow {
  return hasProperties(row, 'comment_id', 'approval_step_id');
}

export interface CommentWithMeta extends Comment {
  approvalStepId: string;
}

export interface CommentWithMetaRow extends CommentRow {
  approval_step_id: string;
}

export const withMetaDataAdapter = new DataAdapter<
  CommentWithMetaRow,
  CommentWithMeta
>();

export function isCommentWithMetaRow(row: object): row is CommentWithMetaRow {
  return isCommentRow && hasProperties(row, 'ApprovalStep_id');
}
