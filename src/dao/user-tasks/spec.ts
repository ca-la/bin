import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import {
  create,
  createAllByUserIdsAndTaskId,
  deleteAllByUserIdsAndTaskId,
  findAllByTaskId,
  findById
} from './index';
import { create as createTask } from '../tasks';
import createUser = require('../../test-helpers/create-user');

test('UserTask DAO supports creation/retrieval', async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();
  const taskOne = await createTask(uuid.v4());

  const userOneTaskOne = await create({
    taskId: taskOne.id,
    userId: userOne.user.id
  });
  const userTwoTaskOne = await create({
    taskId: taskOne.id,
    userId: userTwo.user.id
  });

  const result = await findById(userOneTaskOne.id);
  t.deepEqual(result, userOneTaskOne, 'Returned an inserted user task');

  const secondResult = await findAllByTaskId(taskOne.id);
  t.deepEqual(
    secondResult,
    [userTwoTaskOne, userOneTaskOne],
    'Returned both user task associations for the given task'
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

  const deletionResults = await deleteAllByUserIdsAndTaskId(
    [userOne.user.id, userThree.user.id],
    taskOne.id
  );
  t.deepEqual(deletionResults, 2, 'Deleted the user task associations');
  const firstResult = await findById(userTaskOne.id);
  t.deepEqual(firstResult, null, 'Record is no longer persisted');
  const secondResult = await findById(userTaskTwo.id);
  t.deepEqual(secondResult, userTaskTwo, 'Record is still there.');
  const thirdResult = await findById(userTaskThree.id);
  t.deepEqual(thirdResult, null, 'Record is no longer persisted');
});
