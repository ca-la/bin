import tape from 'tape';
import uuid from 'node-uuid';

import { test } from '../../test-helpers/fresh';
import { create as createTask } from '../../dao/tasks';
import { create as createComment } from '../comments/dao';
import { create, findByTaskId } from './dao';
import createUser from '../../test-helpers/create-user';

test('TaskComment DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const comment1 = await createComment({
    createdAt: now,
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: user.id
  });
  const comment2 = await createComment({
    createdAt: yesterday,
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: user.id
  });
  const task = await createTask();
  await create({
    commentId: comment1.id,
    taskId: task.id
  });
  await create({
    commentId: comment2.id,
    taskId: task.id
  });

  const result = await findByTaskId(task.id);
  t.deepEqual(result, [comment2, comment1], 'Finds comments by task');
});
