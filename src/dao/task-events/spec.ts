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
import { deleteById as deleteDesign } from '../product-designs';
import {
  create as createCollaborator,
  deleteById as deleteCollaborator
} from '../../components/collaborators/dao';
import * as CollaboratorTasksDAO from '../collaborator-tasks';
import { addDesign, create as createCollection } from '../collections';
import { create as createTaskComment } from '../task-comments';
import { del as deleteComponent } from '../../components/components/dao';
import { deleteById as deleteCollection } from '../../dao/collections';
import { deleteById as deleteComment } from '../../components/comments/dao';

import createUser = require('../../test-helpers/create-user');
import {
  DetailsTask,
  DetailsTaskWithAssignees,
  TaskStatus
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
  if (!result) {
    throw Error('No Result');
  }
  const insertedWithDetails = getInsertedWithDetails(inserted, result);
  t.deepEqual(
    { ...result, createdAt: new Date(result.createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
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
  const insertedWithDetails = getInsertedWithDetails(inserted, result);

  t.equal(result.commentCount, 3, 'task has three comments');
  t.deepEqual(
    { ...result, createdAt: new Date(result.createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
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
  const insertedWithDetails = getInsertedWithDetails(inserted, result);

  t.equal(result.commentCount, 0, 'task has no comments');

  t.deepEqual(
    { ...result, createdAt: new Date(result.createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
});

test('Task Events DAO returns tasks inside deleted collections', async (t: tape.Test) => {
  const { task: inserted } = await generateTask();
  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: user.id });
  await deleteCollection(collection.id);

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
  const insertedWithDetails = getInsertedWithDetails(inserted, result);

  t.deepEqual(
    { ...result, createdAt: new Date(result.createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
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
  await deleteCollaborator(collab2.id);

  const result = await findByDesignId(design.id);
  const insertedWithDetails = getInsertedWithDetails(inserted, result[0], [
    collab1
  ]);

  t.deepEqual(
    { ...result[0] },
    insertedWithDetails,
    'Returned first inserted task'
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
  const insertedWithDetails = getInsertedWithDetails(inserted, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
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
  const insertedWithDetails = getInsertedWithDetails(task, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
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
  const insertedWithDetails = getInsertedWithDetails(taskEvent, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
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
  const insertedWithDetails = getInsertedWithDetails(taskEvent, result[0]);
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
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

test('Task Events DAO supports retrieval by userId with stage filter', async (t: tape.Test) => {
  const { user } = await createUser();
  const { user: user2 } = await createUser();
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user2.id
  });
  const stageTitle = 'test';
  const { stage } = await generateProductDesignStage(
    { designId: design.id, title: stageTitle },
    user.id
  );
  const { stage: stage2 } = await generateProductDesignStage(
    { designId: design.id, title: 'not a real title' },
    user.id
  );
  const { task: taskEvent } = await generateTask({
    createdBy: user.id,
    designStageId: stage.id
  });
  await generateTask({ createdBy: user.id, designStageId: stage2.id });
  await createCollaborator({
    cancelledAt: null,
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const result = await findByUserId(user.id, { stageFilter: stageTitle });
  if (result.length === 0) {
    return t.fail('No tasks returned');
  }
  const insertedWithDetails = getInsertedWithDetails(taskEvent, result[0]);
  t.equals(result.length, 1, 'Returns a single task');
  t.deepEqual(
    { ...result[0], createdAt: new Date(result[0].createdAt) },
    insertedWithDetails,
    'Returned inserted task'
  );
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
    'Returned inserted task'
  );
});

test('Task Events DAO supports creating a task with a long description', async (t: tape.Test) => {
  const { user } = await createUser();
  const task = await createTask(uuid.v4());

  const inserted = await create({
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

  t.equal(inserted.description.length, 1000);
});
