import { pick } from 'lodash';
import db from '../../services/db';
import Knex from 'knex';
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

const TABLE_NAME = 'comments';

export function queryComments(trx?: Knex.Transaction): Knex.QueryBuilder {
  return db(TABLE_NAME)
    .select([
      'comments.*',
      { user_name: 'users.name' },
      { user_email: 'users.email' },
      { user_role: 'users.role' }
    ])
    .join('users', 'users.id', 'comments.user_id')
    .where({ 'comments.deleted_at': null })
    .orderBy('created_at', 'asc')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
}

export function queryById(
  id: string,
  trx?: Knex.Transaction
): Knex.QueryBuilder {
  return queryComments(trx)
    .where({ 'comments.id': id })
    .first();
}

export async function create(
  data: BaseComment,
  trx?: Knex.Transaction
): Promise<Comment> {
  const rowDataForInsertion = pick(
    baseDataAdapter.forInsertion(data),
    INSERTABLE_COLUMNS
  );
  await db(TABLE_NAME)
    .insert(rowDataForInsertion)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
  const comment: CommentRow | undefined = await queryById(data.id, trx);

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
  id: string,
  trx?: Knex.Transaction
): Promise<Comment | null> {
  const comment: CommentRow | undefined = await queryById(id, trx);

  if (!comment) {
    return null;
  }

  return validate<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    dataAdapter,
    comment
  );
}

export async function update(
  data: Comment,
  trx?: Knex.Transaction
): Promise<Comment> {
  const rowDataForUpdate = pick(
    dataAdapter.forInsertion(data),
    UPDATABLE_COLUMNS
  );
  await db(TABLE_NAME)
    .where({ id: data.id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .update(rowDataForUpdate);

  const comment: CommentRow | undefined = await queryById(data.id, trx);

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

export async function deleteById(
  id: string,
  trx?: Knex.Transaction
): Promise<void> {
  const deletedRows: number = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .update({ deleted_at: new Date().toISOString() });

  if (deletedRows === 0) {
    throw new Error(`No comment found with id ${id}`);
  }
}
