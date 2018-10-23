import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create as createTask } from '../tasks';
import { create as createComment } from '../comments';
import { create, findByTaskId } from './index';
import createUser = require('../../test-helpers/create-user');

test('TaskComment DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await createComment({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: user.id
  });
  const task = await createTask(uuid.v4());
  await create({
    commentId: comment.id,
    taskId: task.id
  });

  const result = await findByTaskId(task.id);
  t.deepEqual(result, [comment], 'Finds comments by task');
});
