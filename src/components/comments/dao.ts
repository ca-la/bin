import { pick } from 'lodash';
import * as db from '../../services/db';
import * as Knex from 'knex';
import Comment, {
  BaseComment,
  baseDataAdapter,
  CommentRow,
  dataAdapter,
  INSERTABLE_COLUMNS,
  isCommentRow,
  UPDATABLE_COLUMNS
} from '../../components/comments/domain-object';
import { validate } from '../../services/validate-from-db';
import first from '../../services/first';

const TABLE_NAME = 'comments';

export async function create(
  data: BaseComment,
  trx?: Knex.Transaction
): Promise<Comment> {
  const rowDataForInsertion = pick(
    baseDataAdapter.forInsertion(data),
    INSERTABLE_COLUMNS
  );
  await db(TABLE_NAME)
    .insert(rowDataForInsertion);
  const comment: CommentRow | undefined = await db(TABLE_NAME)
    .select(['comments.*', { user_name: 'users.name' }, { user_email: 'users.email' }])
    .join('users', 'users.id', 'comments.user_id')
    .where({ 'comments.id': data.id, 'comments.deleted_at': null })
    .orderBy('created_at', 'asc')
    .limit(1)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((comments: CommentRow[]) => first(comments));

  if (!comment) {
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
  const comment: CommentRow | undefined = await db(TABLE_NAME)
    .select(['comments.*', { user_name: 'users.name' }, { user_email: 'users.email' }])
    .join('users', 'users.id', 'comments.user_id')
    .where({ 'comments.id': id, 'comments.deleted_at': null })
    .orderBy('created_at', 'asc')
    .limit(1)
    .then((comments: CommentRow[]) => first(comments));

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
  const rowDataForUpdate = pick(
    dataAdapter.forInsertion(data),
    UPDATABLE_COLUMNS
  );
  await db(TABLE_NAME)
    .where({ id: data.id, deleted_at: null })
    .update(rowDataForUpdate);

  const comment: CommentRow | undefined = await db(TABLE_NAME)
    .select(['comments.*', { user_name: 'users.name' }, { user_email: 'users.email' }])
    .join('users', 'users.id', 'comments.user_id')
    .where({ 'comments.id': data.id, 'comments.deleted_at': null })
    .orderBy('created_at', 'asc')
    .limit(1)
    .then((comments: CommentRow[]) => first(comments));

  if (!comment) {
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
