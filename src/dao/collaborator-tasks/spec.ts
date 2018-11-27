import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import {
  create,
  createAllByCollaboratorIdsAndTaskId,
  deleteAllByCollaboratorIdsAndTaskId,
  findAllByTaskId,
  findAllCollaboratorsByTaskId
} from './index';
import { create as createTask } from '../tasks';
import { create as createCollaborator } from '../collaborators';
import { create as createCollection } from '../collections';
import createUser = require('../../test-helpers/create-user');

test('CollaboratorTask DAO supports creation/retrieval', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: userOne.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const collaboratorOne = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: userOne.user.id
  });
  const collaboratorTwo = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: userTwo.user.id
  });
  const taskOne = await createTask(uuid.v4());
  const taskTwo = await createTask(uuid.v4());

  const collaboratorOneTaskOne = await create({
    collaboratorId: collaboratorOne.id,
    taskId: taskOne.id
  });
  const collaboratorTwoTaskOne = await create({
    collaboratorId: collaboratorTwo.id,
    taskId: taskOne.id
  });

  t.deepEqual(
    await findAllByTaskId(taskOne.id),
    [collaboratorTwoTaskOne, collaboratorOneTaskOne],
    'Returned both collaborator task associations for the given task'
  );
  t.deepEqual(
    await findAllCollaboratorsByTaskId(taskTwo.id),
    [],
    'Returned an empty list of public collaborators'
  );
});

test('CollaboratorTask DAO does not allow non-unique creation', async (t: tape.Test) => {
  const { user } = await createUser();
  const task = await createTask(uuid.v4());
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const collaborator = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: user.id
  });
  await create({
    collaboratorId: collaborator.id,
    taskId: task.id
  });

  try {
    await create({
      collaboratorId: collaborator.id,
      taskId: task.id
    });
    t.fail('Should not allow duplicate instances');
  } catch {
    t.pass('Does not allow for duplicate instances');
  }
});

test('CollaboratorTask DAO supports multiple simultaneous creations', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();
  const taskOne = await createTask(uuid.v4());
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: userOne.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const collaboratorOne = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: userOne.user.id
  });
  const collaboratorTwo = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: userTwo.user.id
  });

  const results = await createAllByCollaboratorIdsAndTaskId(
    [collaboratorOne.id, collaboratorTwo.id],
    taskOne.id
  );
  t.equal(results.length, 2, 'Created two new records');
});

test('CollaboratorTask DAO prevents task assignment on no collaborators', async (t: tape.Test) => {
  const task = await createTask(uuid.v4());

  try {
    await createAllByCollaboratorIdsAndTaskId([], task.id);
    t.fail('Should not allow empty assignment');
  } catch {
    t.pass('Does not allow empty assignment');
  }
});

test('CollaboratorTask DAO supports multiple simultaneous deletions', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();
  const userThree = await createUser();
  const taskOne = await createTask(uuid.v4());
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: userOne.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const collaboratorOne = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: userOne.user.id
  });
  const collaboratorTwo = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: userTwo.user.id
  });
  const collaboratorThree = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: userThree.user.id
  });
  await create({
    collaboratorId: collaboratorOne.id,
    taskId: taskOne.id
  });
  const collaboratorTaskTwo = await create({
    collaboratorId: collaboratorTwo.id,
    taskId: taskOne.id
  });
  await create({
    collaboratorId: collaboratorThree.id,
    taskId: taskOne.id
  });

  const emptyDeletionResults = await deleteAllByCollaboratorIdsAndTaskId([], taskOne.id);
  t.equal(emptyDeletionResults, 0, 'Specifying no collaborators does not delete anything');

  const deletionResults = await deleteAllByCollaboratorIdsAndTaskId(
    [collaboratorOne.id, collaboratorThree.id],
    taskOne.id
  );
  t.deepEqual(await
    findAllByTaskId(taskOne.id), [collaboratorTaskTwo], 'Record is still there.');
  t.deepEqual(deletionResults, 2, 'Deleted the collaborator task associations');
});
