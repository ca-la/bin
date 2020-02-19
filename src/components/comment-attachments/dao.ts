import Knex = require('knex');

import CommentAttachment, {
  CommentAttachmentRow,
  dataAdapter,
  isCommentAttachmentRow
} from './domain-object';
import { validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'comment_attachments';

export async function createAll(
  trx: Knex.Transaction,
  data: CommentAttachment[]
): Promise<CommentAttachment[]> {
  const rowData = data.map((commentAttachment: CommentAttachment) =>
    dataAdapter.forInsertion(commentAttachment)
  );
  const commentAttachments: CommentAttachmentRow[] = await trx(
    TABLE_NAME
  ).insert(rowData, '*');

  return validateEvery<CommentAttachmentRow, CommentAttachment>(
    TABLE_NAME,
    isCommentAttachmentRow,
    dataAdapter,
    commentAttachments
  );
}
