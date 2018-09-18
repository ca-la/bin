import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, findAllByCollectionId, findById } from './index';
import { create as createTask } from '../tasks';
import { create as createCollection } from '../collections';
import { create as createCollectionStage } from '../collection-stages';
import createUser = require('../../test-helpers/create-user');
import Task from '../../domain-objects/task';
import CollectionStage from '../../domain-objects/collection-stage';

test('Collection Stage Task DAO supports creation/retrieval', async (t: tape.Test) => {
  const userId = await createUser().then((response: any) => response.user.id);
  let taskId = '';

  const inserted = await createTask().then((task: Task) => {
    taskId = task.id;
    return createCollection({ createdBy: userId });
  })
  .then((collection: any) => createCollectionStage({ collectionId: collection.id, title: 'test' }))
  .then((collectionStage: CollectionStage) =>
    create({ collectionStageId: collectionStage.id, taskId }));

  const result = await findById(inserted.id);
  t.deepEqual(result, inserted, 'Returned inserted task');
});

test('Collection Stage Task DAO supports retrieval by collectionId', async (t: tape.Test) => {
  const userId = await createUser().then((response: any) => response.user.id);
  let taskId = '';
  let collectionId = '';

  const inserted = await createTask().then((task: Task) => {
    taskId = task.id;
    return createCollection({ createdBy: userId });
  })
  .then((collection: any) => {
    collectionId = collection.id;
    return createCollectionStage({ collectionId: collection.id, title: 'test' });
  })
  .then((collectionStage: CollectionStage) =>
    create({ collectionStageId: collectionStage.id, taskId }));

  const result = await findAllByCollectionId(collectionId);
  t.deepEqual(result[0], inserted, 'Returned inserted task');
});
