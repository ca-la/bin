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
import { create as createCollaboratorTask } from '../collaborator-tasks';
import { create as createDesignStageTask } from '../product-design-stage-tasks';
import { create as createDesignStage } from '../product-design-stages';
import { create as createDesign } from '../product-designs';
import { create as createCollaborator } from '../collaborators';
import { addDesign, create as createCollection } from '../collections';
import createUser = require('../../test-helpers/create-user');
import { TaskStatus } from '../../domain-objects/task-event';
import omit = require('lodash/omit');

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

  const result = await findById(inserted.taskId);
  if (!result) { throw Error('No Result'); }
  const insertedWithStage = {
    ...inserted,
    designStageId: result.designStageId
  };
  t.deepEqual(
    omit(result, 'createdAt'),
    omit(insertedWithStage, 'createdAt'),
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by designId', async (t: tape.Test) => {
  const { user } = await createUser();

  const task = await createTask(uuid.v4());
  const taskTwo = await createTask(uuid.v4());
  const taskThree = await createTask(uuid.v4());
  const inserted = await create({
    createdBy: user.id,
    description: '',
    designStageId: null,
    dueDate: null,
    ordering: 0,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  });
  const insertedTwo = await create({
    createdBy: user.id,
    description: '',
    designStageId: null,
    dueDate: null,
    ordering: 1,
    status: TaskStatus.NOT_STARTED,
    taskId: taskTwo.id,
    title: 'My First Task'
  });
  const insertedThree = await create({
    createdBy: user.id,
    description: '',
    designStageId: null,
    dueDate: null,
    ordering: 1,
    status: TaskStatus.NOT_STARTED,
    taskId: taskThree.id,
    title: 'My First Task'
  });
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: task.id });
  await createDesignStageTask({ designStageId: stage.id, taskId: taskTwo.id });
  await createDesignStageTask({ designStageId: stage.id, taskId: taskThree.id });

  const result = await findByDesignId(design.id);
  const insertedWithStage = {
    ...inserted,
    designStageId: result[0].designStageId
  };
  const secondInsertion = {
    ...insertedTwo,
    designStageId: result[1].designStageId
  };
  const thirdInsertion = {
    ...insertedThree,
    designStageId: result[2].designStageId
  };

  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithStage, 'createdAt'),
    'Returned first inserted task'
  );
  t.deepEqual(
    omit(result[1], 'createdAt'),
    omit(secondInsertion, 'createdAt'),
    'Returned second inserted task'
  );
  t.deepEqual(
    omit(result[2], 'createdAt'),
    omit(thirdInsertion, 'createdAt'),
    'Returned third inserted task'
  );
});

test('Task Events DAO supports retrieval by collectionId', async (t: tape.Test) => {
  const { user } = await createUser();

  const task = await createTask(uuid.v4());
  const inserted = await create({
    createdBy: user.id,
    description: '',
    designStageId: null,
    dueDate: null,
    ordering: 0,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  });
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: task.id });

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
  const insertedWithStage = {
    ...inserted,
    designStageId: result[0].designStageId
  };
  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithStage, 'createdAt'),
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by userId', async (t: tape.Test) => {
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
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  const taskEvent = await create({
    createdBy: user.id,
    description: 'A description',
    designStageId: null,
    dueDate: null,
    ordering: 0,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My New Task'
  });
  await createCollaboratorTask({ collaboratorId: collaborator.id, taskId: task.id });

  const result = await findByUserId(user.id);
  if (result.length === 0) { return t.fail('No tasks returned'); }
  const insertedWithStage = {
    ...taskEvent,
    designStageId: result[0].designStageId
  };
  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithStage, 'createdAt'),
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by stageId', async (t: tape.Test) => {
  const { user } = await createUser();

  const task = await createTask(uuid.v4());
  const inserted = await create({
    createdBy: user.id,
    description: '',
    designStageId: null,
    dueDate: null,
    ordering: 0,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  });
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: task.id });

  const result = await findByStageId(stage.id);
  const insertedWithStage = {
    ...inserted,
    designStageId: result[0].designStageId
  };
  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithStage, 'createdAt'),
    'Returned inserted task');
});
