import * as Knex from 'knex';
import * as db from '../../services/db';
import TaskComment, {
  CommentWithCollaborator,
  CommentWithCollaboratorRow,
  dataAdapter,
  isCommentWithCollaboratorRow,
  isTaskCommentRow,
  TaskCommentRow,
  withCollaboratorDataAdapter
} from './domain-object';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'task_comments';

export async function create(
  data: TaskComment,
  trx?: Knex.Transaction
): Promise<TaskComment> {
  const rowData = dataAdapter.forInsertion(data);
  const taskComments: TaskCommentRow[] = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  const taskComment = taskComments[0];
  if (!data) {
    throw new Error('There was a problem saving the comment');
  }

  return validate<TaskCommentRow, TaskComment>(
    TABLE_NAME,
    isTaskCommentRow,
    dataAdapter,
    taskComment
  );
}

export async function findByTaskId(
  taskId: string,
  trx?: Knex.Transaction
): Promise<CommentWithCollaborator[]> {
  const comments: CommentWithCollaboratorRow[] = await db
    .select([
      'comments.*',
      { user_name: 'users.name' },
      { user_email: 'users.email' },
      db.raw(`
array_remove(
  array_agg(
    CASE
      WHEN co.id IS NOT null THEN jsonb_build_object('id', co.id, 'cancelled_at', co.cancelled_at)
      ELSE null
    END
  ),
  null
) AS collaborators
      `)
    ])
    .from('comments')
    .join('task_comments', 'task_comments.comment_id', 'comments.id')
    .join('users', 'users.id', 'comments.user_id')
    .leftJoin(
      'product_design_stage_tasks AS pdst',
      'pdst.task_id',
      'task_comments.task_id'
    )
    .leftJoin('product_design_stages AS pds', 'pds.id', 'pdst.design_stage_id')
    .leftJoin('collection_designs AS cd', 'cd.design_id', 'pds.design_id')
    .leftJoin('collections', 'collections.id', 'cd.collection_id')
    .joinRaw(
      'LEFT JOIN collaborators AS co ON (co.design_id = pds.design_id OR co.collection_id = collections.id) AND co.user_id = users.id'
    )
    .where({
      'comments.deleted_at': null,
      'task_comments.task_id': taskId
    })
    .groupBy('comments.id', 'users.name', 'users.email')
    .orderBy('comments.created_at', 'asc')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<CommentWithCollaboratorRow, CommentWithCollaborator>(
    TABLE_NAME,
    isCommentWithCollaboratorRow,
    withCollaboratorDataAdapter,
    comments
  );
}
