import tape from 'tape';
import uuid from 'node-uuid';
import { TaskStatus } from '@cala/ts-lib';
import Knex from 'knex';

import { sandbox, test as originalTest } from '../../test-helpers/fresh';
import {
  create,
  createAll,
  findByApprovalStepId,
  findByCollectionId,
  findByDesignId,
  findById,
  findByStageId,
  findByUserId,
  findRawById
} from './index';

import db from '../../services/db';
import * as StageTemplate from '../../components/tasks/templates';
import { create as createTask } from '../tasks';
import { create as createDesignStageTask } from '../product-design-stage-tasks';
import { create as createDesignStage } from '../product-design-stages';
import { deleteById as deleteDesign } from '../../test-helpers/designs';
import {
  create as createCollaborator,
  deleteById as deleteCollaborator
} from '../../components/collaborators/dao';
import * as CollaboratorTasksDAO from '../collaborator-tasks';
import {
  create as createCollection,
  deleteById as deleteCollection
} from '../../components/collections/dao';
import { create as createTaskComment } from '../../components/task-comments/dao';
import { del as deleteComponent } from '../../components/components/dao';
import { deleteById as deleteComment } from '../../components/comments/dao';

import createUser = require('../../test-helpers/create-user');
import {
  DetailsTask,
  DetailsTaskWithAssignees
} from '../../domain-objects/task-event';
import generateTask from '../../test-helpers/factories/task';
import generateProductDesignStage from '../../test-helpers/factories/product-design-stage';
import generateComment from '../../test-helpers/factories/comment';
import generateComponent from '../../test-helpers/factories/component';
import generateCanvas from '../../test-helpers/factories/product-design-canvas';

import createDesign from '../../services/create-design';
import generateCollection from '../../test-helpers/factories/collection';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import { CollaboratorWithUser } from '../../components/collaborators/domain-objects/collaborator';
import generateAsset from '../../test-helpers/factories/asset';
import { addDesign } from '../../test-helpers/collections';
import ApprovalStep, {
  ApprovalStepState
} from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import * as ApprovalStepTaskDAO from '../../components/approval-step-tasks/dao';

const beforeEach = (): void => {
  sandbox()
    .stub(StageTemplate, 'getTemplatesFor')
    .returns([]);
};

function test(
  description: string,
  testCase: (t: tape.Test) => Promise<void>
): void {
  originalTest(description, async (t: tape.Test) => testCase(t), beforeEach);
}

const getInsertedWithDetails = (
  inserted: DetailsTask,
  result: DetailsTaskWithAssignees,
  expectedAssignees: CollaboratorWithUser[] = []
): DetailsTaskWithAssignees => {
  return {
    ...inserted,
    assignees: expectedAssignees,
    collection: {
      createdAt: result.collection.createdAt,
      id: result.collection.id,
      title: result.collection.title
    },
    commentCount: result.commentCount,
    design: {
      createdAt: result.design.createdAt,
      id: result.design.id,
      previewImageUrls: result.design.previewImageUrls,
      imageLinks: result.design.imageLinks,
      title: result.design.title
    },
    designStage: {
      createdAt: null,
      id: result.designStage.id,
      ordering: result.designStage.ordering,
      title: result.designStage.title
    },
    designStageId: result.designStage.id
  };
};

test('Task Events DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();
  const task = await createTask();
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
  if (!result) {
    throw Error('No Result');
  }
  t.deepEqual(inserted.taskId, result.id, 'Returned inserted task');
});

test('Task Events DAO supports raw retrieval', async (t: tape.Test) => {
  const { user } = await createUser();
  const task = await createTask();
  const taskData = {
    createdBy: user.id,
    description: 'A description',
    designStageId: null,
    dueDate: null,
    ordering: 0,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  };
  const inserted = await create(taskData);

  const result = await findRawById(inserted.taskId);
  if (!result) {
    throw Error('No Result');
  }
  t.deepEqual(inserted.taskId, result.taskId, 'Returned inserted task');
});

test('Task Events DAO returns correct number of comments', async (t: tape.Test) => {
  const { task: inserted } = await generateTask();

  const { comment } = await generateComment();
  const { comment: comment2 } = await generateComment();
  const { comment: comment3 } = await generateComment();

  await createTaskComment({ commentId: comment.id, taskId: inserted.id });
  await createTaskComment({ commentId: comment2.id, taskId: inserted.id });
  await createTaskComment({ commentId: comment3.id, taskId: inserted.id });

  const result = await findById(inserted.id);
  if (!result) {
    throw Error('No Result');
  }

  t.equal(result.commentCount, 3, 'task has three comments');
  t.deepEqual(inserted.id, result.id, 'Returned inserted task');
});

test('Task Events DAO returns tasks even if they have deleted comments', async (t: tape.Test) => {
  const { task: inserted } = await generateTask();

  const { comment } = await generateComment();
  await deleteComment(comment.id);

  await createTaskComment({ commentId: comment.id, taskId: inserted.id });

  const result = await findById(inserted.id);
  if (!result) {
    throw Error('No Result');
  }

  t.equal(result.commentCount, 0, 'task has no comments');

  t.deepEqual(inserted.id, result.id, 'Returned inserted task');
});

test('Task Events DAO returns tasks inside deleted collections', async (t: tape.Test) => {
  const { task: inserted } = await generateTask();
  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: user.id });
  await db.transaction(async (trx: Knex.Transaction) => {
    await deleteCollection(trx, collection.id);
  });

  const design = await createDesign({
    userId: user.id,
    productType: 'test',
    title: 'test'
  });
  await addDesign(collection.id, design.id);
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });

  await createDesignStageTask({ designStageId: stage.id, taskId: inserted.id });

  const result = await findById(inserted.id);
  if (!result) {
    throw Error('No Result');
  }

  t.deepEqual(inserted.id, result.id, 'Returned inserted task');
});

test('Task Events DAO returns images from the canvases on the design', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { asset: sketch } = await generateAsset({
    description: '',
    id: uuid.v4(),
    mimeType: 'image/png',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: 'FooBar.png',
    userId: user.id
  });
  const { component } = await generateComponent({
    createdBy: user.id,
    sketchId: sketch.id
  });
  const { design } = await generateCanvas({
    componentId: component.id,
    createdBy: user.id
  });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  const { task: inserted } = await generateTask({ designStageId: stage.id });

  const result = await findById(inserted.id);
  if (!result) {
    throw Error('No Result');
  }
  if (!result.design.previewImageUrls) {
    throw Error('Task has no images!');
  }

  t.equal(
    result.design.previewImageUrls.length,
    1,
    'task has one preview image'
  );
  t.ok(
    result.design.previewImageUrls[0].includes(sketch.id),
    'the task image is the sketch'
  );

  await deleteComponent(component.id);

  const secondResult = await findById(inserted.id);
  if (!secondResult) {
    throw Error('No Result');
  }
  t.deepEqual(
    secondResult.design.previewImageUrls,
    [],
    'task has an empty list of images'
  );
});

test('Task Events DAO supports retrieval by designId', async (t: tape.Test) => {
  const { task: inserted, createdBy: user } = await generateTask({
    ordering: 0
  });
  const { task: insertedTwo } = await generateTask({
    createdBy: user.id,
    ordering: 1
  });
  const { task: insertedThree } = await generateTask({
    createdBy: user.id,
    ordering: 2
  });
  const design = await createDesign({
    userId: user.id,
    productType: 'test',
    title: 'test'
  });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: inserted.id });
  await createDesignStageTask({
    designStageId: stage.id,
    taskId: insertedTwo.id
  });
  await createDesignStageTask({
    designStageId: stage.id,
    taskId: insertedThree.id
  });

  const result = await findByDesignId(design.id);
  const insertedWithDetails = getInsertedWithDetails(inserted, result[0]);
  const secondInsertion = getInsertedWithDetails(insertedTwo, result[1]);
  const thirdInsertion = getInsertedWithDetails(insertedThree, result[2]);

  t.deepEqual(
    { ...result[0] },
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

test('Task Events DAO returns assignees for existing collaborators', async (t: tape.Test) => {
  const { task: inserted, createdBy: user } = await generateTask({
    ordering: 0
  });
  const { collection } = await generateCollection({ createdBy: user.id });
  const design = await createDesign({
    userId: user.id,
    productType: 'test',
    title: 'test'
  });
  await addDesign(collection.id, design.id);
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  const task = await createDesignStageTask({
    designStageId: stage.id,
    taskId: inserted.id
  });

  const { user: collab1User } = await createUser({ withSession: false });
  const { user: collab2User } = await createUser({ withSession: false });

  const { collaborator: collab1 } = await generateCollaborator({
    collectionId: collection.id,
    userId: collab1User.id
  });
  const { collaborator: collab2 } = await generateCollaborator({
    collectionId: collection.id,
    userId: collab2User.id
  });
  await CollaboratorTasksDAO.createAllByCollaboratorIdsAndTaskId(
    [collab1.id, collab2.id],
    task.taskId
  );
  const deletedCollaborator = await deleteCollaborator(collab2.id);

  const result = await findByDesignId(design.id);
  const insertedWithDetails = getInsertedWithDetails(inserted, result[0], [
    { ...collab2, cancelledAt: deletedCollaborator.cancelledAt },
    collab1
  ]);

  t.deepEqual(
    { ...result[0] },
    insertedWithDetails,
    'Returned first inserted task with all associated collaborators'
  );
});

test('Task Events DAO does not retrieve deleted design tasks', async (t: tape.Test) => {
  const { task: inserted, createdBy: user } = await generateTask({});
  const { task: insertedTwo } = await generateTask({ createdBy: user.id });
  const { task: insertedThree } = await generateTask({ createdBy: user.id });
  const design = await createDesign({
    userId: user.id,
    productType: 'test',
    title: 'test'
  });
  const stage = await createDesignStage({
    description: '',
    designId: design.id,
    ordering: 0,
    title: 'test'
  });
  await createDesignStageTask({ designStageId: stage.id, taskId: inserted.id });
  await createDesignStageTask({
    designStageId: stage.id,
    taskId: insertedTwo.id
  });
  await createDesignStageTask({
    designStageId: stage.id,
    taskId: insertedThree.id
  });
  await deleteDesign(design.id);

  const result = await findByDesignId(design.id);

  t.deepEqual(result, [], 'Does not return any tasks');
});

test('Task Events DAO supports retrieval by collectionId', async (t: tape.Test) => {
  const { task: inserted, createdBy: user } = await generateTask({});
  const design = await createDesign({
    userId: user.id,
    productType: 'test',
    title: 'test'
  });
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
  t.deepEqual(inserted.id, result[0].id, 'Returned inserted task');
});

test('Task Events DAO supports retrieval by userId on own design', async (t: tape.Test) => {
  const { user } = await createUser();

  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage } = await generateProductDesignStage(
    { designId: design.id },
    user.id
  );
  const { task } = await generateTask({
    createdBy: user.id,
    designStageId: stage.id
  });

  const result = await findByUserId(user.id);
  if (result.length === 0) {
    return t.fail('No tasks returned');
  }
  t.deepEqual(task.id, result[0].id, 'Returned inserted task');
});

test('Task Events DAO supports retrieval by userId in the stage ordering', async (t: tape.Test) => {
  const { user } = await createUser();

  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage: stageOne } = await generateProductDesignStage(
    { designId: design.id, ordering: 1 },
    user.id
  );
  const { stage: stageTwo } = await generateProductDesignStage(
    { designId: design.id, ordering: 0 },
    user.id
  );
  const { stage: stageThree } = await generateProductDesignStage(
    { designId: design.id, ordering: 2 },
    user.id
  );

  const { task } = await generateTask({
    createdBy: user.id,
    designStageId: stageThree.id,
    ordering: 0
  });
  const { task: taskTwo } = await generateTask({
    createdBy: user.id,
    designStageId: stageTwo.id,
    ordering: 0
  });
  const { task: taskThree } = await generateTask({
    createdBy: user.id,
    designStageId: stageOne.id,
    ordering: 0
  });
  const { task: taskFour } = await generateTask({
    createdBy: user.id,
    designStageId: stageTwo.id,
    ordering: 1
  });

  const result = await findByUserId(user.id);
  if (result.length === 0) {
    return t.fail('No tasks returned');
  }

  t.equal(result.length, 4);
  // stageTwo tasks should appear first.
  t.equal(result[0].id, taskTwo.id);
  t.equal(result[0].designStage.id, stageTwo.id);
  t.equal(result[1].id, taskFour.id);
  t.equal(result[1].designStage.id, stageTwo.id);
  // stageOne tasks should appear second.
  t.equal(result[2].id, taskThree.id);
  t.equal(result[2].designStage.id, stageOne.id);
  // stageThree tasks should appear last.
  t.equal(result[3].id, task.id);
  t.equal(result[3].designStage.id, stageThree.id);
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
  const { stage } = await generateProductDesignStage(
    { designId: design.id },
    user.id
  );
  const { task: taskEvent } = await generateTask({
    createdBy: user.id,
    designStageId: stage.id
  });
  await createCollaborator({
    cancelledAt: null,
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const result = await findByUserId(user.id);
  if (result.length === 0) {
    return t.fail('No tasks returned');
  }
  t.deepEqual(taskEvent.id, result[0].id, 'Returned inserted task');
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
  const { stage } = await generateProductDesignStage(
    { designId: design.id },
    user.id
  );
  const { task: taskEvent } = await generateTask({
    createdBy: user.id,
    designStageId: stage.id
  });
  await createCollaborator({
    cancelledAt: null,
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const result = await findByUserId(user.id);
  if (result.length === 0) {
    return t.fail('No tasks returned');
  }
  t.deepEqual(taskEvent.id, result[0].id, 'Returned inserted task');
});

test('Task Events DAO supports retrieval by userId with assignee filter', async (t: tape.Test) => {
  const { user } = await createUser();
  const { user: user2 } = await createUser();
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user2.id
  });
  const { stage } = await generateProductDesignStage(
    { designId: design.id },
    user.id
  );
  const { task: taskEvent } = await generateTask({
    createdBy: user.id,
    designStageId: stage.id
  });
  await generateTask({ createdBy: user.id, designStageId: stage.id });
  const collaborator = await createCollaborator({
    cancelledAt: null,
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  await CollaboratorTasksDAO.create({
    taskId: taskEvent.id,
    collaboratorId: collaborator.id
  });

  const result = await findByUserId(user.id, { assignFilterUserId: user.id });
  if (result.length === 0) {
    return t.fail('No tasks returned');
  }
  const insertedWithDetails = getInsertedWithDetails(taskEvent, result[0], [
    collaborator
  ]);
  t.equals(result.length, 1, 'Only one task is returned');
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned task assigned to collaborator'
  );
});

test('Task Events DAO supports retrieval by design id', async (t: tape.Test) => {
  const { user } = await createUser();
  const design1 = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage: stage1 } = await generateProductDesignStage(
    { designId: design1.id },
    user.id
  );
  const { task: taskEvent } = await generateTask({
    createdBy: user.id,
    designStageId: stage1.id
  });
  const design2 = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage: stage2 } = await generateProductDesignStage(
    { designId: design2.id },
    user.id
  );
  await generateTask({
    createdBy: user.id,
    designStageId: stage2.id
  });

  const result = await findByUserId(user.id, {
    filters: [{ type: 'DESIGN', value: design1.id }]
  });
  if (result.length === 0) {
    return t.fail('No tasks returned');
  }
  const insertedWithDetails = getInsertedWithDetails(taskEvent, result[0]);
  t.equals(result.length, 1, 'Only one task is returned');
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned task assigned to collaborator'
  );
});

test('Task Events DAO supports retrieval by with collection id filter', async (t: tape.Test) => {
  const { user } = await createUser();

  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const design1 = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  await addDesign(collection.id, design1.id);
  const { stage: stage1 } = await generateProductDesignStage(
    { designId: design1.id },
    user.id
  );
  await generateTask({
    createdBy: user.id,
    designStageId: stage1.id
  });
  const collection2 = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const design2 = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  await addDesign(collection2.id, design2.id);
  const { stage: stage2 } = await generateProductDesignStage(
    { designId: design2.id },
    user.id
  );
  await generateTask({
    createdBy: user.id,
    designStageId: stage2.id
  });
  const design3 = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage: stage3 } = await generateProductDesignStage(
    { designId: design3.id },
    user.id
  );
  await generateTask({
    createdBy: user.id,
    designStageId: stage3.id
  });

  const wildcardResult = await findByUserId(user.id, {
    filters: [{ type: 'COLLECTION', value: '*' }]
  });
  if (wildcardResult.length === 0) {
    return t.fail('No tasks returned');
  }
  t.equals(wildcardResult.length, 2, 'Tasks in collections are returned');
  wildcardResult.forEach(
    (task: DetailsTaskWithAssignees): void => {
      t.notEqual(task.collection, undefined, 'Collection task returned');
    }
  );

  const singleResult = await findByUserId(user.id, {
    filters: [{ type: 'COLLECTION', value: collection.id }]
  });
  if (singleResult.length === 0) {
    return t.fail('No tasks returned');
  }
  t.equals(singleResult.length, 1, 'Only one task is returned');
  t.equals(
    singleResult[0].collection.id,
    collection.id,
    'Collection task returned'
  );
});

test('Task Events DAO supports retrieval by completed/incomplete status', async (t: tape.Test) => {
  const { user } = await createUser();
  const designWithIncompleteTasks = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage: stage1 } = await generateProductDesignStage(
    { designId: designWithIncompleteTasks.id },
    user.id
  );
  const { task: incompleteTaskEvent } = await generateTask({
    createdBy: user.id,
    designStageId: stage1.id,
    status: TaskStatus.IN_PROGRESS
  });
  const designWithCompletedTasks = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage: stage2 } = await generateProductDesignStage(
    { designId: designWithCompletedTasks.id },
    user.id
  );
  const { task: completedTaskEvent } = await generateTask({
    createdBy: user.id,
    designStageId: stage2.id,
    status: TaskStatus.COMPLETED
  });

  const incompleteResult = await findByUserId(user.id, {
    filters: [{ type: 'STATUS', value: 'INCOMPLETE' }]
  });
  if (incompleteResult.length === 0) {
    return t.fail('No tasks returned');
  }
  const insertedWithDetails1 = getInsertedWithDetails(
    incompleteTaskEvent,
    incompleteResult[0]
  );
  t.equals(incompleteResult.length, 1, 'Only one task is returned');
  t.deepEqual(
    {
      ...incompleteResult[0],
      createdAt: new Date(incompleteResult[0].createdAt),
      status: TaskStatus.IN_PROGRESS
    },
    insertedWithDetails1,
    'Returned task is not complete'
  );

  const completedResult = await findByUserId(user.id, {
    filters: [{ type: 'STATUS', value: 'COMPLETED' }]
  });
  if (completedResult.length === 0) {
    return t.fail('No tasks returned');
  }
  const insertedWithDetails2 = getInsertedWithDetails(
    completedTaskEvent,
    completedResult[0]
  );
  t.equals(completedResult.length, 1, 'Only one task is returned');
  t.deepEqual(
    {
      ...completedResult[0],
      createdAt: new Date(completedResult[0].createdAt),
      status: TaskStatus.COMPLETED
    },
    insertedWithDetails2,
    'Returned task is complete'
  );
});

test('Task Events DAO supports retrieval by userId with multiple stage filter', async (t: tape.Test) => {
  const { user } = await createUser();
  const { user: user2 } = await createUser();
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user2.id
  });
  const { stage: stage1 } = await generateProductDesignStage(
    { designId: design.id, title: 'stage1' },
    user.id
  );
  const { stage: stage2 } = await generateProductDesignStage(
    { designId: design.id, title: 'stage2' },
    user.id
  );
  const { stage: stage3 } = await generateProductDesignStage(
    { designId: design.id, title: 'stage3' },
    user.id
  );
  const { task: taskEvent1 } = await generateTask({
    createdBy: user.id,
    designStageId: stage1.id
  });
  await generateTask({
    createdBy: user.id,
    designStageId: stage2.id
  });
  await generateTask({ createdBy: user.id, designStageId: stage3.id });
  await createCollaborator({
    cancelledAt: null,
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const singleStageResult = await findByUserId(user.id, {
    filters: [{ type: 'STAGE', value: stage1.title }]
  });
  if (singleStageResult.length === 0) {
    return t.fail('No tasks returned');
  }
  t.equals(singleStageResult.length, 1, 'Returns a single task');
  t.deepEqual(taskEvent1.id, singleStageResult[0].id, 'Returned inserted task');

  const multipleStageResult = await findByUserId(user.id, {
    filters: [{ type: 'STAGE', value: `${stage1.title},${stage2.title}` }]
  });
  if (multipleStageResult.length === 0) {
    return t.fail('No tasks returned');
  }
  t.equals(multipleStageResult.length, 2, 'Returns multiple task');
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
  t.deepEqual(inserted.id, result[0].id, 'Returned inserted task');
});

test('Task Events DAO supports retrieval by approval step id', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
    productType: 'test',
    title: 'test',
    userId: user.id
  });
  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: design.id,
    reason: null
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const { task } = await generateTask();
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepTaskDAO.create(trx, {
      taskId: task.id,
      approvalStepId: approvalStep.id
    })
  );
  const result = await findByApprovalStepId(approvalStep.id);
  t.deepEqual(task.id, result[0].id, 'Returned inserted task');
});

test('Task Events DAO supports creating a task with a long description', async (t: tape.Test) => {
  const { user } = await createUser();
  const task = await createTask();

  const insertedId = await create({
    createdBy: user.id,
    // tslint:disable-next-line:prefer-array-literal
    description: new Array(1000).fill('a').join(''),
    designStageId: null,
    dueDate: null,
    ordering: 0,
    status: TaskStatus.NOT_STARTED,
    taskId: task.id,
    title: 'My First Task'
  });

  const inserted = await findRawById(insertedId.taskId);
  if (!inserted) {
    throw new Error('Could not find task!');
  }

  t.equal(inserted.description.length, 1000);
});

test('Task Events DAO supports create all', async (t: tape.Test) => {
  const { user } = await createUser();
  const task = await createTask();
  const task2 = await createTask();
  const inserted = await createAll([
    {
      createdBy: user.id,
      description: 'A description',
      designStageId: null,
      dueDate: null,
      ordering: 0,
      status: TaskStatus.NOT_STARTED,
      taskId: task.id,
      title: 'My First Task'
    },
    {
      createdBy: user.id,
      description: 'A description',
      designStageId: null,
      dueDate: null,
      ordering: 0,
      status: TaskStatus.NOT_STARTED,
      taskId: task2.id,
      title: 'My First Task'
    }
  ]);

  const result = await findById(inserted[0].taskId);
  const result2 = await findById(inserted[1].taskId);
  if (!result || !result2) {
    throw Error('No Result');
  }
  t.deepEqual(inserted[0].taskId, result.id, 'Returned inserted task');
  t.deepEqual(inserted[1].taskId, result2.id, 'Returned inserted task');
});
