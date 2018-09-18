import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, findByCollectionId, findById, findByStageId } from './index';
import { create as createTask } from '../tasks';
import { create as createCollectionStageTask } from '../collection-stage-tasks';
import { create as createCollectionStage } from '../collection-stages';
import { create as createCollection } from '../collections';
import createUser = require('../../test-helpers/create-user');
import { TaskStatus } from '../../domain-objects/task-event';
import Task from '../../domain-objects/task';
import CollectionStage from '../../domain-objects/collection-stage';

test('Task Events DAO supports creation/retrieval', async (t: tape.Test) => {
  const userId = await createUser().then((data: any): string => data.user.id);
  const inserted = await createTask().then((task: Task) =>
    create({
      createdBy: userId,
      dueDate: null,
      status: TaskStatus.NOT_STARTED,
      taskId: task.id,
      title: 'My First Task'
    }));

  const result = await findById(inserted.taskId);
  t.equal(result.taskId, inserted.taskId, 'Returned inserted task');
});

test('Task Events DAO supports retrieval by collectionId', async (t: tape.Test) => {
  const userId = await createUser().then((data: any): string => data.user.id);
  let collectionId = 'test';
  let taskId = 'test';
  const inserted = await createTask()
    .then((task: Task) => {
      taskId = task.id;
      return create({
        createdBy: userId,
        dueDate: null,
        status: TaskStatus.NOT_STARTED,
        taskId: task.id,
        title: 'My First Task'
      });
    })
    .then(() => createCollection({ createdBy: userId }))
    .then((collection: any) => {
      collectionId = collection.id;
      return createCollectionStage({ collectionId: collection.id, title: 'test' });
    })
    .then((collectionStage: CollectionStage) => {
      return createCollectionStageTask({ collectionStageId: collectionStage.id, taskId });
    });

  const result = await findByCollectionId(collectionId);
  t.equal(result[0].taskId, inserted.taskId, 'Returned inserted task');
});

test('Task Events DAO supports retrieval by stageId', async (t: tape.Test) => {
  const userId = await createUser().then((data: any): string => data.user.id);
  let stageId = 'test';
  let taskId = 'test';
  const inserted = await createTask()
    .then((task: Task) => {
      taskId = task.id;
      return create({
        createdBy: userId,
        dueDate: null,
        status: TaskStatus.NOT_STARTED,
        taskId: task.id,
        title: 'My First Task'
      });
    })
    .then(() => createCollection({ createdBy: userId }))
    .then((collection: any) => {
      return createCollectionStage({ collectionId: collection.id, title: 'test' });
    })
    .then((collectionStage: CollectionStage) => {
      stageId = collectionStage.id;
      return createCollectionStageTask({ collectionStageId: collectionStage.id, taskId });
    });

  const result = await findByStageId(stageId);
  t.equal(result[0].taskId, inserted.taskId, 'Returned inserted task');
});
