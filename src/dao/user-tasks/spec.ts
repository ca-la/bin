import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import {
  create,
  createAllByUserIdsAndTaskId,
  deleteAllByUserIdsAndTaskId,
  findAllByTaskId,
  findAllUsersByTaskId,
  findById
} from './index';
import { create as createTask } from '../tasks';
import createUser = require('../../test-helpers/create-user');

test('UserTask DAO supports creation/retrieval', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();
  const taskOne = await createTask(uuid.v4());
  const taskTwo = await createTask(uuid.v4());

  const userOneTaskOne = await create({
    taskId: taskOne.id,
    userId: userOne.user.id
  });
  const userTwoTaskOne = await create({
    taskId: taskOne.id,
    userId: userTwo.user.id
  });

  t.deepEqual(
    await findById(userOneTaskOne.id),
    userOneTaskOne,
    'Returned an inserted user task'
  );
  t.deepEqual(
    await findAllByTaskId(taskOne.id),
    [userTwoTaskOne, userOneTaskOne],
    'Returned both user task associations for the given task'
  );
  t.deepEqual(
    await findAllUsersByTaskId(taskOne.id),
    [{
      id: userTwo.user.id,
      name: userTwo.user.name,
      referralCode: userTwo.user.referralCode
    }, {
      id: userOne.user.id,
      name: userOne.user.name,
      referralCode: userOne.user.referralCode
    }],
    'Returned both users for the given task'
  );
  t.deepEqual(
    await findAllUsersByTaskId(taskTwo.id),
    [],
    'Returned an empty list of public users'
  );
});

test('UserTask DAO does not allow non-unique creation', async (t: tape.Test) => {
  const { user } = await createUser();
  const task = await createTask(uuid.v4());
  await create({
    taskId: task.id,
    userId: user.id
  });

  try {
    await create({
      taskId: task.id,
      userId: user.id
    });
    t.fail('Should not allow duplicate instances');
  } catch {
    t.pass('Does not allow for duplicate instances');
  }
});

test('UserTask DAO supports multiple simultaneous creations', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();
  const taskOne = await createTask(uuid.v4());

  const results = await createAllByUserIdsAndTaskId(
    [userOne.user.id, userTwo.user.id],
    taskOne.id
  );
  t.equal(results.length, 2, 'Created two new records');
});

test('UserTask DAO prevents task assignment on no users', async (t: tape.Test) => {
  const task = await createTask(uuid.v4());

  try {
    await createAllByUserIdsAndTaskId([], task.id);
    t.fail('Should not allow empty assignment');
  } catch {
    t.pass('Does not allow empty assignment');
  }
});

test('UserTask DAO supports multiple simultaneous deletions', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();
  const userThree = await createUser();
  const taskOne = await createTask(uuid.v4());
  const userTaskOne = await create({
    taskId: taskOne.id,
    userId: userOne.user.id
  });
  const userTaskTwo = await create({
    taskId: taskOne.id,
    userId: userTwo.user.id
  });
  const userTaskThree = await create({
    taskId: taskOne.id,
    userId: userThree.user.id
  });

  const emptyDeletionResults = await deleteAllByUserIdsAndTaskId([], taskOne.id);
  t.equal(emptyDeletionResults, 0, 'Specifying no users does not delete anything');

  const deletionResults = await deleteAllByUserIdsAndTaskId(
    [userOne.user.id, userThree.user.id],
    taskOne.id
  );
  t.deepEqual(deletionResults, 2, 'Deleted the user task associations');
  t.deepEqual(await findById(userTaskOne.id), null, 'Record is no longer persisted');
  t.deepEqual(await findById(userTaskTwo.id), userTaskTwo, 'Record is still there.');
  t.deepEqual(await findById(userTaskThree.id), null, 'Record is no longer persisted');
});
