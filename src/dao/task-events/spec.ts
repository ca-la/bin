import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import {
  create,
  findByCollectionId,
  findByDesignId,
  findById,
  findByStageId,
  findByUserId
} from './index';
import { create as createTask } from '../tasks';
import { create as createDesignStageTask } from '../product-design-stage-tasks';
import { create as createDesignStage } from '../product-design-stages';
import { create as createDesign, deleteById as deleteDesign } from '../product-designs';
import { create as createCollaborator } from '../collaborators';
import { addDesign, create as createCollection } from '../collections';
import createUser = require('../../test-helpers/create-user');
import { DetailsTask, TaskStatus } from '../../domain-objects/task-event';
import generateTask from '../../test-helpers/factories/task';
import generateProductDesignStage from '../../test-helpers/factories/product-design-stage';

const getInsertedWithDetails = (
  inserted: DetailsTask, result: DetailsTask
): DetailsTask => {
  return {
    ...inserted,
    collection: {
      id: result.collection.id,
      title: result.collection.title
    },
    design: {
      id: result.design.id,
      previewImageUrls: result.design.previewImageUrls,
      title: result.design.title
    },
    designStage: {
      id: result.designStage.id,
      title: result.designStage.title
    },
    designStageId: result.designStage.id
  };
};

test('Task Events DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();
  const task = await createTask(uuid.v4());
  const inserted = await create({
    createdBy: user.id,
    description: 'A description',
    designStageId: null,
    dueDate: null,
    ordering: 0,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  });

  const result = await findById(inserted.id);
  if (!result) { throw Error('No Result'); }
  const insertedWithDetails = getInsertedWithDetails(inserted, result);
  t.deepEqual(
    { ...result, createdAt: new Date(result.createdAt) },
    insertedWithDetails,
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by designId', async (t: tape.Test) => {
  const { task: inserted, createdBy: user } = await generateTask({});
  const { task: insertedTwo } = await generateTask({ createdBy: user.id });
  const { task: insertedThree } = await generateTask({ createdBy: user.id });
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: inserted.id });
  await createDesignStageTask({ designStageId: stage.id, taskId: insertedTwo.id });
  await createDesignStageTask({ designStageId: stage.id, taskId: insertedThree.id });

  const result = await findByDesignId(design.id);
  const insertedWithDetails = getInsertedWithDetails(inserted, result[0]);
  const secondInsertion = getInsertedWithDetails(insertedTwo, result[1]);
  const thirdInsertion = getInsertedWithDetails(insertedThree, result[2]);

  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned first inserted task'
  );
  t.deepEqual(
    { ...result[1], createdAt: new Date(result[1].createdAt) },
    secondInsertion,
    'Returned second inserted task'
  );
  t.deepEqual(
    { ...result[2], createdAt: new Date(result[2].createdAt) },
    thirdInsertion,
    'Returned third inserted task'
  );
});

test('Task Events DAO does not retrieve deleted design tasks', async (t: tape.Test) => {
  const { task: inserted, createdBy: user } = await generateTask({});
  const { task: insertedTwo } = await generateTask({ createdBy: user.id });
  const { task: insertedThree } = await generateTask({ createdBy: user.id });
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: inserted.id });
  await createDesignStageTask({ designStageId: stage.id, taskId: insertedTwo.id });
  await createDesignStageTask({ designStageId: stage.id, taskId: insertedThree.id });
  await deleteDesign(design.id);

  const result = await findByDesignId(design.id);

  t.deepEqual(result, [], 'Does not return any tasks');
});

test('Task Events DAO supports retrieval by collectionId', async (t: tape.Test) => {
  const { task: inserted, createdBy: user } = await generateTask({});
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: inserted.id });

  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: null
  });
  await addDesign(collection.id, design.id);

  const result = await findByCollectionId(collection.id);
  const insertedWithDetails = getInsertedWithDetails(inserted, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by userId on own design', async (t: tape.Test) => {
  const { user } = await createUser();

  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage } = await generateProductDesignStage({ designId: design.id }, user.id);
  const { task } = await generateTask({ createdBy: user.id, designStageId: stage.id });

  const result = await findByUserId(user.id);
  if (result.length === 0) { return t.fail('No tasks returned'); }
  const insertedWithDetails = getInsertedWithDetails(task, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by userId on shared collection', async (t: tape.Test) => {
  const { user } = await createUser();
  const { user: user2 } = await createUser();
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user2.id
  });
  await addDesign(collection.id, design.id);
  const { stage } = await generateProductDesignStage({ designId: design.id }, user.id);
  const { task: taskEvent } = await generateTask({ createdBy: user.id, designStageId: stage.id });
  await createCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const result = await findByUserId(user.id);
  if (result.length === 0) { return t.fail('No tasks returned'); }
  const insertedWithDetails = getInsertedWithDetails(taskEvent, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by userId on shared design', async (t: tape.Test) => {
  const { user } = await createUser();
  const { user: user2 } = await createUser();
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user2.id
  });
  const { stage } = await generateProductDesignStage({ designId: design.id }, user.id);
  const { task: taskEvent } = await generateTask({ createdBy: user.id, designStageId: stage.id });
  await createCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const result = await findByUserId(user.id);
  if (result.length === 0) { return t.fail('No tasks returned'); }
  const insertedWithDetails = getInsertedWithDetails(taskEvent, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by stageId', async (t: tape.Test) => {
  const { task: inserted, createdBy: user } = await generateTask({});
  const design = await createDesign({
    productType: 'test',
    title: 'test',
    userId: user.id
  });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: inserted.id });

  const result = await findByStageId(stage.id);
  const insertedWithDetails = getInsertedWithDetails(inserted, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task');
});
