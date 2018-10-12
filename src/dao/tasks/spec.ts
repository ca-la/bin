import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create, findById } from './index';
import Task from '../../domain-objects/task';

test('Tasks DAO supports creation/retrieval', async (t: tape.Test) => {
  let taskId = '';
  const inserted = await create(uuid.v4()).then((task: Task) => {
    taskId = task.id;
    return task;
  });

  const result = await findById(taskId);
  t.deepEqual(result, inserted, 'Returned inserted task');
});
