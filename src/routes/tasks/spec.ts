import * as tape from 'tape';
import * as uuid from 'node-uuid';
import * as sinon from 'sinon';

import User from '../../domain-objects/user';
import { DetailsTask, TaskStatus } from '../../domain-objects/task-event';
import * as TaskEventsDAO from '../../dao/task-events';
import * as TasksDAO from '../../dao/tasks';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as CollectionsDAO from '../../dao/collections';
import * as productDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import createUser = require('../../test-helpers/create-user');
import { authHeader, get, post, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as CreateNotifications from '../../services/create-notifications';
import Collaborator from '../../domain-objects/collaborator';
import generateTask from '../../test-helpers/factories/task';
import createDesign from '../../services/create-design';
import generateProductDesignStage from '../../test-helpers/factories/product-design-stage';

const BASE_TASK_EVENT: DetailsTask & { assignees: Collaborator[] } = {
  assignees: [],
  collection: {
    id: uuid.v4(),
    title: 'test'
  },
  commentCount: 0,
  createdAt: new Date(),
  createdBy: uuid.v4(),
  description: 'test',
  design: {
    id: uuid.v4(),
    previewImageUrls: [],
    title: 'test'
  },
  designStage: {
    id: uuid.v4(),
    ordering: 0,
    title: 'test'
  },
  designStageId: uuid.v4(),
  dueDate: null,
  id: uuid.v4(),
  ordering: 0,
  status: TaskStatus.IN_PROGRESS,
  title: 'test'
};

function createTaskEvents(user: User): (DetailsTask & { assignees: Collaborator[] })[] {
  const taskId = uuid.v4();
  const now = new Date();
  const earlier = new Date(now);
  earlier.setHours(now.getHours() - 1);

  return [{
    ...BASE_TASK_EVENT,
    createdAt: now,
    createdBy: user.id,
    id: taskId
  }, {
    ...BASE_TASK_EVENT,
    createdAt: earlier,
    createdBy: user.id,
    description: 'Changed the description',
    id: taskId
  }];
}

test('GET /tasks/:taskId returns Task', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const taskEvents = createTaskEvents(user);

  const taskId = uuid.v4();
  const taskEvent = { ...BASE_TASK_EVENT, id: taskId };

  sandbox().stub(TaskEventsDAO, 'findById').returns(Promise.resolve(taskEvent));
  sandbox().stub(CollaboratorTasksDAO, 'findAllCollaboratorsByTaskId').resolves([]);

  const [response, body] = await get(`/tasks/${taskEvents[0].id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, 'should respond with 200');
  t.deepEqual(
    { ...body, createdAt: new Date(body.createdAt) },
    { ...taskEvent, createdAt: new Date(taskEvent.createdAt) },
    'should match body');
});

test('GET /tasks?collectionId=:collectionId returns tasks on collection', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const collectionId = uuid.v4();

  const taskEvents = createTaskEvents(user);

  sandbox().stub(TaskEventsDAO, 'findByCollectionId').resolves(taskEvents);

  const [response, body] = await get(`/tasks?collectionId=${collectionId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, 'should respond with 200');
  t.deepEqual(body, [
    {
      ...taskEvents[0],
      assignees: [],
      createdAt: taskEvents[0].createdAt.toISOString(),
      id: taskEvents[0].id
    },
    {
      ...taskEvents[1],
      assignees: [],
      createdAt: taskEvents[1].createdAt.toISOString(),
      id: taskEvents[1].id
    }
  ], 'should match body');
});

test('GET /tasks?stageId=:stageId returns tasks on design stage', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const stageId = uuid.v4();
  const taskEvents = createTaskEvents(user);

  sandbox().stub(TaskEventsDAO, 'findByStageId').resolves(taskEvents);
  sandbox().stub(CollaboratorTasksDAO, 'findAllCollaboratorsByTaskId').resolves([]);

  const [response, body] = await get(`/tasks?stageId=${stageId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200, 'should respond with 200');
  t.deepEqual(body, [
    {
      ...taskEvents[0],
      assignees: [],
      createdAt: taskEvents[0].createdAt.toISOString(),
      id: taskEvents[0].id
    },
    {
      ...taskEvents[1],
      assignees: [],
      createdAt: taskEvents[1].createdAt.toISOString(),
      id: taskEvents[1].id
    }
  ], 'should match body');
});

test('GET /tasks?userId=:userId returns all tasks for a user', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  await CollectionsDAO.addDesign(collection.id, design.id);
  const { stage } = await generateProductDesignStage({ designId: design.id }, user.id);

  const collaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  const { task } = await generateTask({ designStageId: stage.id });

  const design2 = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const { stage: stage2 } = await generateProductDesignStage({ designId: design2.id }, user.id);

  const { task: task2 } = await generateTask({ createdBy: user.id, designStageId: stage2.id });
  await CollaboratorTasksDAO
    .create({ collaboratorId: collaborator.id, taskId: task.id });

  const [response, body] = await get(`/tasks?userId=${user.id}`, {
    headers: authHeader(session.id)
  });

  if (body.length === 0) { return t.fail('no content'); }
  t.equal(response.status, 200, 'it should respond with 200');
  t.equal(body.length, 2, 'it should have 2 tasks');
  t.equal(body[0].id, task.id, 'task[0] should match ids');
  t.equal(body[0].assignees.length, 1, 'task[0] should have 1 assignee');
  t.equal(body[1].id, task2.id, 'task[1] should match ids');
});

test('POST /tasks creates Task and TaskEvent successfully', async (t: tape.Test) => {
  const { session } = await createUser();

  const [response] = await post('/tasks', {
    body: BASE_TASK_EVENT,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
});

test('PUT /tasks/:taskId creates TaskEvent successfully', async (t: tape.Test) => {
  const { session } = await createUser();

  const taskId = uuid.v4();
  TasksDAO.create(taskId);

  const [response, body] = await put(`/tasks/${taskId}`, {
    body: { ...BASE_TASK_EVENT, id: taskId },
    headers: authHeader(session.id)  });
  t.equal(response.status, 201);
  t.equal(body.id, taskId);
});

test('PUT /tasks/:taskId/assignees adds Collaborators to Tasks successfully',
async (t: tape.Test) => {
  const stubNotification = sandbox()
    .stub(CreateNotifications, 'sendTaskAssignmentNotification')
    .resolves();

  const { session, user } = await createUser();
  const secondUser = await createUser();
  const task = await TasksDAO.create(uuid.v4());
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const collaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  const secondCollaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: secondUser.user.id
  });

  const [responseOne, bodyOne] = await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [collaborator.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseOne.status, 200);
  t.equal(bodyOne[0].collaboratorId, collaborator.id);
  t.deepEqual(
    stubNotification.getCall(0).args,
    [task.id, user.id, [collaborator.id]],
    'It sends a notification to collaborators'
  );
  stubNotification.resetHistory();

  const [responseTwo, bodyTwo] = await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [collaborator.id, secondCollaborator.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseTwo.status, 200);
  t.equal(bodyTwo[0].collaboratorId, secondCollaborator.id);
  t.equal(bodyTwo[1].collaboratorId, collaborator.id);
  t.deepEqual(
    stubNotification.getCall(0).args,
    [task.id, user.id, [secondCollaborator.id]],
    'It sends a notification to new collaborators'
  );
  stubNotification.resetHistory();

  const [responseThree, bodyThree] = await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [secondCollaborator.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseThree.status, 200);
  t.equal(bodyThree[0].collaboratorId, secondCollaborator.id);
  t.equal(
    stubNotification.callCount,
    0,
    'It does not send a notification if no new collaborators were added'
  );
  stubNotification.resetHistory();

  const [responseFour, bodyFour] = await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [] },
    headers: authHeader(session.id)
  });
  t.equal(responseFour.status, 200);
  t.equal(bodyFour.length, 0);
  t.equal(
    stubNotification.callCount,
    0,
    'It does not send a notification when unassigning all'
  );
  stubNotification.resetHistory();
});

test('PUT /tasks/:taskId when changing status to Completed',
async (t: tape.Test) => {
  const { session, user } = await createUser();
  const secondUser = await createUser();
  const task = await TasksDAO.create(uuid.v4());
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });

  const collaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: secondUser.user.id
  });
  const event = {
    ...BASE_TASK_EVENT,
    assignees: [collaborator],
    createdBy: user.id,
    designStageId: null,
    id: task.id
  };
  await put(`/tasks/${task.id}`, {
    body: event,
    headers: authHeader(session.id)
  });

  const assignmentNotificationStub = sandbox()
    .stub(CreateNotifications, 'sendTaskAssignmentNotification')
    .resolves();
  await put(`/tasks/${task.id}/assignees`, {
    body: { collaboratorIds: [collaborator.id] },
    headers: authHeader(session.id)
  });

  const completionNotificationStub = sandbox()
    .stub(CreateNotifications, 'sendTaskCompletionNotification')
    .resolves();
  await put(`/tasks/${task.id}`, {
    body: {
      ...event,
      status: TaskStatus.COMPLETED
    },
    headers: authHeader(session.id)
  });

  t.deepEqual(
    completionNotificationStub.getCall(0).args,
    [task.id, user.id],
    'It sends a completion notification'
  );
  t.deepEqual(
    assignmentNotificationStub.getCall(0).args,
    [task.id, user.id, [collaborator.id]],
    'It sends a completion notification'
  );
});

test('POST /tasks/stage/:stageId creates Task on Stage successfully', async (t: tape.Test) => {
  const { session } = await createUser();

  const taskId = uuid.v4();
  const stageId = uuid.v4();
  const stageTaskId = uuid.v4();

  sandbox().stub(TasksDAO, 'create').returns(Promise.resolve(
    {
      id: taskId
    }
  ));

  sandbox().stub(productDesignStageTasksDAO, 'create').returns(Promise.resolve(
    {
      designStageId: stageId,
      id: stageTaskId
    }
  ));

  sandbox().stub(TaskEventsDAO, 'create').returns(
    Promise.resolve({ ...BASE_TASK_EVENT, id: taskId, designStageId: stageId })
  );
  sandbox().stub(TaskEventsDAO, 'findById').returns(
    Promise.resolve({ ...BASE_TASK_EVENT, id: taskId, designStageId: stageId })
  );

  const [response, body] = await post(`/tasks/stage/${stageId}`, {
    body: BASE_TASK_EVENT,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.id, taskId);
  t.equal(body.designStageId, stageId);
});

test('PUT /tasks/:taskId/comment/:id creates a task comment', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const taskId = uuid.v4();
  const notificationStub = sandbox()
    .stub(CreateNotifications, 'sendTaskCommentCreateNotification')
    .resolves();

  await post('/tasks', {
    body: { ...BASE_TASK_EVENT, id: taskId },
    headers: authHeader(session.id)
  });
  const commentBody = {
    createdAt: new Date().toISOString(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userEmail: 'cool@me.me',
    userId: 'purposefully incorrect',
    userName: 'Somebody Cool'
  };
  const comment = await put(
    `/tasks/${taskId}/comments/${uuid.v4()}`,
    {
      body: commentBody,
      headers: authHeader(session.id)
    }
  );
  t.equal(comment[0].status, 201, 'Comment creation succeeds');
  const taskComment = await get(
    `/tasks/${taskId}/comments`,
    { headers: authHeader(session.id) }
  );

  t.equal(taskComment[0].status, 200, 'Comment retrieval succeeds');
  t.deepEqual(
    taskComment[1],
    [{
      ...commentBody,
      userEmail: user.email,
      userId: user.id,
      userName: user.name
    }],
    'Comment retrieval returns the created comment in an array'
  );

  // A notification is sent when comments are made
  sinon.assert.callCount(notificationStub, 1);
});
