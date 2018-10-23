import { omit } from 'lodash';
import * as db from '../../services/db';
import Comment, { CommentRow, dataAdapter, isCommentRow } from '../../domain-objects/comment';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'comments';

export async function create(
  data: Comment
): Promise<Comment> {
  const rowData = dataAdapter.forInsertion(data);
  const comments: CommentRow[] = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*');

  const comment = comments[0];
  if (!data) {
    throw new Error('There was a problem saving the comment');
  }

  return validate<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    dataAdapter,
    comment
  );
}

export async function findById(
  id: string
): Promise<Comment | null> {
  const comments: CommentRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .orderBy('created_at', 'asc')
    .limit(1);

  const comment = comments[0];
  if (!comment) { return null; }

  return validate<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    dataAdapter,
    comment
  );
}

export async function update(
  data: Comment
): Promise<Comment> {
  const rowData = dataAdapter.forInsertion(data);
  const comments: CommentRow[] = await db(TABLE_NAME)
    .where({ id: data.id, deleted_at: null })
    .update(omit(rowData, ['id']))
    .returning('*');

  const comment = comments[0];
  if (!data) {
    throw new Error('There was a problem saving the comment');
  }

  return validate<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    dataAdapter,
    comment
  );
}

export async function deleteById(id: string): Promise<void> {
  const deletedRows: number = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date().toISOString() });

  if (deletedRows === 0) {
    throw new Error(`No comment found with id ${id}`);
  }
}
