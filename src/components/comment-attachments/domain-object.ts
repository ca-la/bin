import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export default interface CommentAttachment {
  commentId: string;
  assetId: string;
}

export interface CommentAttachmentRow {
  comment_id: string;
  asset_id: string;
}

export const dataAdapter = new DataAdapter<
  CommentAttachmentRow,
  CommentAttachment
>();

export function isCommentAttachmentRow(
  row: object
): row is CommentAttachmentRow {
  return hasProperties(row, 'comment_id', 'asset_id');
}
