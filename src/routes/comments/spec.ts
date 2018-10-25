import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, post, put } from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';

test('DELETE /comment/:id deletes a task comment', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const task = await post('/tasks', {
    body: {
      assignees: [],
      createdAt: new Date().toISOString(),
      createdBy: 'purposefully incorrect',
      description: 'Description',
      designStageId: null,
      dueDate: null,
      id: uuid.v4(),
      status: null,
      title: 'Title'
    },
    headers: authHeader(session.id)
  });
  const commentBody = {
    createdAt: new Date().toISOString(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: 'purposefully incorrect'
  };
  const comment = await put(
    `/tasks/${task[1].id}/comments/${uuid.v4()}`,
    {
      body: commentBody,
      headers: authHeader(session.id)
    }
  );
  const withComment = await get(
    `/tasks/${task[1].id}/comments`,
    { headers: authHeader(session.id) }
  );

  t.deepEqual(
    withComment[1],
    [{
      ...commentBody,
      userId: user.id
    }],
    'Comment retrieval returns the created comment in an array'
  );
  const deleteRequest = await del(
    `/comments/${comment[1].id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(deleteRequest[0].status, 204, 'Comment deletion succeeds');
  const withoutComment = await get(
    `/tasks/${task[1].id}/comments`,
    { headers: authHeader(session.id) }
  );

  t.equal(withoutComment[0].status, 200, 'Comment retrieval succeeds');
  t.deepEqual(
    withoutComment[1],
    [],
    'Comment retrieval does not include deleted comment'
  );
});