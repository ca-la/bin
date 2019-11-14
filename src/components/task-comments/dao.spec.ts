import tape from 'tape';
import uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create as createTask } from '../../dao/tasks';
import { create as createComment } from '../comments/dao';
import { create, findByTaskId } from './dao';
import createUser = require('../../test-helpers/create-user');
import generateComment from '../../test-helpers/factories/comment';
import generateProductDesignStage from '../../test-helpers/factories/product-design-stage';
import { create as createStageTask } from '../../dao/product-design-stage-tasks';
import * as CollaboratorsDAO from '../collaborators/dao';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import { omit } from 'lodash';

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
  t.deepEqual(
    result,
    [{ ...comment2, collaborators: [] }, { ...comment1, collaborators: [] }],
    'Finds comments by task'
  );
});

test('findByTaskId returns with collaborator information', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });

  const { design, stage } = await generateProductDesignStage({}, user.id);
  const col1 = await CollaboratorsDAO.findByDesignAndUser(design.id, user.id);
  const { collaborator: col2 } = await generateCollaborator({
    designId: design.id,
    userId: user2.id
  });
  const { collaborator: col3 } = await generateCollaborator({
    designId: design.id,
    userId: user2.id
  });
  const deletedCollaborator = await CollaboratorsDAO.deleteById(col2.id);
  if (!col1) {
    throw new Error('No collaborator found for the design!');
  }

  const { comment: comment1 } = await generateComment({ userId: user.id });
  const { comment: comment2 } = await generateComment({ userId: user2.id });
  const task = await createTask();
  await createStageTask({
    designStageId: stage.id,
    taskId: task.id
  });

  await create({
    commentId: comment1.id,
    taskId: task.id
  });
  await create({
    commentId: comment2.id,
    taskId: task.id
  });

  const result = await findByTaskId(task.id);
  t.equal(result.length, 2, 'Returns two comments');
  t.deepEqual(
    omit(result[0], 'collaborators'),
    comment1,
    'Returns the first comment made'
  );
  t.deepEqual(
    omit(result[1], 'collaborators'),
    comment2,
    'Returns the second comment made'
  );

  t.deepEqual(
    result[0].collaborators,
    [{ cancelledAt: null, id: col1.id }],
    'Returns the collaborators tied with the first user'
  );
  t.equal(
    result[1].collaborators.length,
    2,
    'Returns all collaborators tied to the second user for the design'
  );
  t.deepEqual(
    result[1].collaborators[0],
    { cancelledAt: null, id: col3.id },
    'First collaborator is the newest one made'
  );
  t.deepEqual(
    {
      ...result[1].collaborators[1],
      cancelledAt: new Date(result[1].collaborators[1].cancelledAt!)
    },
    {
      cancelledAt: deletedCollaborator.cancelledAt,
      id: col2.id
    },
    'Second collaborator is the oldest one made that was deleted'
  );
});
