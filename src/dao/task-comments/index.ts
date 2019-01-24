import * as db from '../../services/db';
import Comment, {
  CommentRow,
  dataAdapter as commentAdapter,
  isCommentRow
} from '../../domain-objects/comment';
import TaskComment, {
  dataAdapter,
  isTaskCommentRow,
  TaskCommentRow
} from '../../domain-objects/task-comment';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'task_comments';

export async function create(
  data: TaskComment
): Promise<TaskComment> {
  const rowData = dataAdapter.forInsertion(data);
  const taskComments: TaskCommentRow[] = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*');

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
  taskId: string
): Promise<Comment[] | null> {
  const comments: CommentRow[] = await db
    .select(['comments.*', { user_name: 'users.name' }, { user_email: 'users.email' }])
    .from('comments')
    .join('task_comments', 'task_comments.comment_id', 'comments.id')
    .join('users', 'users.id', 'comments.user_id')
    .where({
      'comments.deleted_at': null,
      'task_comments.task_id': taskId
    })
    .orderBy('comments.created_at', 'asc');

  return validateEvery<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    commentAdapter,
    comments
  );
}
