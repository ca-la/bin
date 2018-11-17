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
  const inserted = await create({
    createdBy: user.id,
    description: '',
    designStageId: null,
    dueDate: null,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  });
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({ description: '', designId: design.id, title: 'test' });
  await createDesignStageTask({ designStageId: stage.id, taskId: task.id });

  const result = await findByDesignId(design.id);
  const insertedWithStage = {
    ...inserted,
    designStageId: result[0].designStageId
  };
  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithStage, 'createdAt'),
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by collectionId', async (t: tape.Test) => {
  const { user } = await createUser();

  const task = await createTask(uuid.v4());
  const inserted = await create({
    createdBy: user.id,
    description: '',
    designStageId: null,
    dueDate: null,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  });
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({ description: '', designId: design.id, title: 'test' });
  await createDesignStageTask({ designStageId: stage.id, taskId: task.id });

  const collection = await createCollection({ createdBy: user.id });
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
    createdBy: user.id,
    title: 'FW19'
  });

  const collaborator = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: user.id
  });
  const taskEvent = await create({
    createdBy: user.id,
    description: 'A description',
    designStageId: null,
    dueDate: null,
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
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  });
  const design = await createDesign({ userId: user.id, productType: 'test', title: 'test' });
  const stage = await createDesignStage({ description: '', designId: design.id, title: 'test' });
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
