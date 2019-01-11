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
import generateTask from '../../test-helpers/factories/task';

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
  const insertedWithDetails = {
    ...inserted,
    designStageId: result.designStageId
  };
  t.deepEqual(
    omit(result, 'createdAt'),
    omit(insertedWithDetails, 'createdAt'),
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
  const insertedWithDetails = {
    ...inserted,
    collection: {
      id: result[0].collection.id,
      title: result[0].collection.title
    },
    design: {
      id: result[0].design.id,
      title: result[0].design.title
    },
    designStage: {
      id: result[0].designStage.id,
      title: result[0].designStage.title
    },
    designStageId: result[0].designStage.id
  };
  const secondInsertion = {
    ...insertedTwo,
    collection: {
      id: result[0].collection.id,
      title: result[0].collection.title
    },
    design: {
      id: result[0].design.id,
      title: result[0].design.title
    },
    designStage: {
      id: result[0].designStage.id,
      title: result[0].designStage.title
    },
    designStageId: result[0].designStage.id
  };
  const thirdInsertion = {
    ...insertedThree,
    collection: {
      id: result[0].collection.id,
      title: result[0].collection.title
    },
    design: {
      id: result[0].design.id,
      title: result[0].design.title
    },
    designStage: {
      id: result[0].designStage.id,
      title: result[0].designStage.title
    },
    designStageId: result[0].designStage.id
  };

  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithDetails, 'createdAt'),
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
  const insertedWithDetails = {
    ...inserted,
    collection: {
      id: result[0].collection.id,
      title: result[0].collection.title
    },
    design: {
      id: result[0].design.id,
      title: result[0].design.title
    },
    designStage: {
      id: result[0].designStage.id,
      title: result[0].designStage.title
    },
    designStageId: result[0].designStage.id
  };
  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithDetails, 'createdAt'),
    'Returned inserted task');
});

test('Task Events DAO supports retrieval by userId', async (t: tape.Test) => {
  const { user } = await createUser();
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
  const { task: taskEvent } = await generateTask({ createdBy: user.id });
  await createCollaboratorTask({ collaboratorId: collaborator.id, taskId: taskEvent.id });

  const result = await findByUserId(user.id);
  if (result.length === 0) { return t.fail('No tasks returned'); }
  const insertedWithDetails = {
    ...taskEvent,
    collection: {
      id: result[0].collection.id,
      title: result[0].collection.title
    },
    design: {
      id: result[0].design.id,
      title: result[0].design.title
    },
    designStage: {
      id: result[0].designStage.id,
      title: result[0].designStage.title
    },
    designStageId: result[0].designStage.id
  };
  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithDetails, 'createdAt'),
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
  const insertedWithDetails = {
    ...inserted,
    collection: {
      id: result[0].collection.id,
      title: result[0].collection.title
    },
    design: {
      id: result[0].design.id,
      title: result[0].design.title
    },
    designStage: {
      id: result[0].designStage.id,
      title: result[0].designStage.title
    },
    designStageId: result[0].designStage.id
  };
  t.deepEqual(
    omit(result[0], 'createdAt'),
    omit(insertedWithDetails, 'createdAt'),
    'Returned inserted task');
});
