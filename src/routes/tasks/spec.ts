import { omit } from 'lodash';

import User from '../../domain-objects/user';
import TaskEvent from '../../domain-objects/task-event';
import * as taskEventsDAO from '../../dao/task-events';
import * as tasksDAO from '../../dao/tasks';
import * as userTasksDAO from '../../dao/user-tasks';
import * as productDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, get, post, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';

function createTaskEvents(user: User): TaskEvent[] {
  const taskEventId = uuid.v4();
  const taskId = uuid.v4();
  const now = new Date();
  const earlier = new Date(now);
  earlier.setHours(now.getHours() - 1);

  return [{
    createdAt: now,
    createdBy: user.id,
    description: '',
    designStageId: null,
    dueDate: null,
    id: taskEventId,
    status: null,
    taskId,
    title: ''
  }, {
    createdAt: earlier,
    createdBy: user.id,
    description: 'Changed the description',
    designStageId: null,
    dueDate: null,
    id: taskEventId,
    status: null,
    taskId,
    title: ''
  }];
}

test('GET /tasks/:taskId returns Task', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const taskEvents = createTaskEvents(user);

  sandbox().stub(taskEventsDAO, 'findById').resolves(taskEvents[0]);
  sandbox().stub(userTasksDAO, 'findAllUsersByTaskId').resolves([]);

  const [response, body] = await get(`/tasks/${taskEvents[0].taskId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    ...omit(taskEvents[0], ['taskId']),
    assignees: [],
    createdAt: taskEvents[0].createdAt.toISOString(),
    id: taskEvents[0].taskId
  });
});

test('GET /tasks?collectionId=:collectionId returns tasks on collection', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const collectionId = uuid.v4();

  const taskEvents = createTaskEvents(user);

  sandbox().stub(taskEventsDAO, 'findByCollectionId').resolves(taskEvents);

  const [response, body] = await get(`/tasks?collectionId=${collectionId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, [{
    ...omit(taskEvents[0], ['taskId']),
    assignees: [],
    createdAt: taskEvents[0].createdAt.toISOString(),
    id: taskEvents[0].taskId
  }]);
});

test('GET /tasks?stageId=:stageId returns tasks on design stage', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const stageId = uuid.v4();
  const taskEvents = createTaskEvents(user);

  sandbox().stub(taskEventsDAO, 'findByStageId').resolves(taskEvents);
  sandbox().stub(userTasksDAO, 'findAllUsersByTaskId').resolves([]);

  const [response, body] = await get(`/tasks?stageId=${stageId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, [{
    ...omit(taskEvents[0], ['taskId']),
    assignees: [],
    createdAt: taskEvents[0].createdAt.toISOString(),
    id: taskEvents[0].taskId
  }]);
});

test('GET /tasks?userId=:userId returns all tasks for a user', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const taskEvents = createTaskEvents(user);

  sandbox().stub(taskEventsDAO, 'findByUserId').resolves(taskEvents);
  sandbox().stub(userTasksDAO, 'findAllUsersByTaskId').resolves([
    { id: user.id, name: user.name }
  ]);

  const [response, body] = await get(`/tasks?userId=${user.id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, [{
    ...omit(taskEvents[0], ['taskId']),
    assignees: [{ id: user.id, name: user.name }],
    createdAt: taskEvents[0].createdAt.toISOString(),
    id: taskEvents[0].taskId
  }]);
});

test('POST /tasks creates Task and TaskEvent successfully', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const taskEventId = uuid.v4();
  const taskId = uuid.v4();

  sandbox().stub(tasksDAO, 'create').returns(Promise.resolve(
    {
      id: taskId
    }
  ));

  sandbox().stub(taskEventsDAO, 'create').returns(Promise.resolve(
    {
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      dueDate: '',
      id: taskEventId,
      status: '',
      taskId,
      title: ''
    }
  ));

  const [response] = await post('/tasks', {
    body: {
      assignees: [],
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      description: 'Description',
      designStageId: null,
      dueDate: null,
      id: taskId,
      status: null,
      title: 'Title'
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
});

test('PUT /tasks/:taskId creates TaskEvent successfully', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const taskId = uuid.v4();
  const taskEventId = uuid.v4();

  sandbox().stub(tasksDAO, 'create').returns(Promise.resolve(
    {
      id: taskId
    }
  ));

  sandbox().stub(taskEventsDAO, 'create').returns(Promise.resolve(
    {
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      dueDate: '',
      id: taskEventId,
      status: '',
      taskId,
      title: ''
    }
  ));

  const [response, body] = await put(`/tasks/${taskId}`, {
    body: {
      assignees: [],
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      description: 'Description',
      designStageId: null,
      dueDate: null,
      id: taskId,
      status: null,
      title: 'Title'
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.id, taskId);
});

test('PUT /tasks/:taskId/assignees adds Users to Tasks successfully', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const secondUser = await createUser();
  const task = await tasksDAO.create(uuid.v4());

  const [responseOne, bodyOne] = await put(`/tasks/${task.id}/assignees`, {
    body: { userIds: [user.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseOne.status, 200);
  t.equal(bodyOne[0].userId, user.id);

  const [responseTwo, bodyTwo] = await put(`/tasks/${task.id}/assignees`, {
    body: { userIds: [user.id, secondUser.user.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseTwo.status, 200);
  t.equal(bodyTwo[0].userId, secondUser.user.id);
  t.equal(bodyTwo[1].userId, user.id);

  const [responseThree, bodyThree] = await put(`/tasks/${task.id}/assignees`, {
    body: { userIds: [secondUser.user.id] },
    headers: authHeader(session.id)
  });
  t.equal(responseThree.status, 200);
  t.equal(bodyThree[0].userId, secondUser.user.id);

  const [responseFour, bodyFour] = await put(`/tasks/${task.id}/assignees`, {
    body: { userIds: [] },
    headers: authHeader(session.id)
  });
  t.equal(responseFour.status, 200);
  t.equal(bodyFour.length, 0);
});

test('POST /tasks/stage/:stageId creates Task on Stage successfully', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const taskId = uuid.v4();
  const stageId = uuid.v4();
  const stageTaskId = uuid.v4();

  sandbox().stub(tasksDAO, 'create').returns(Promise.resolve(
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

  sandbox().stub(taskEventsDAO, 'create').returns(Promise.resolve(
    {
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      dueDate: '',
      id: taskId,
      status: '',
      taskId,
      title: ''
    }
  ));

  const [response, body] = await post(`/tasks/stage/${stageId}`, {
    body: {
      assignees: [],
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      description: 'Description',
      designStageId: stageId,
      dueDate: null,
      id: taskId,
      status: null,
      title: 'Title'
    },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.id, taskId);
  t.equal(body.designStageId, stageId);
});

test('PUT /tasks/:taskId/comment/:id creates a task comment', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const task = await post('/tasks', {
    body: {
      assignees: [],
      createdAt: new Date().toISOString(),
      createdBy: 'purposefully incorrect',
      description: 'Description',
      designStageId: null,
      dueDate: null,
      id: uuid.v4(),
      status: null,
      title: 'Title'
    },
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
    `/tasks/${task[1].id}/comments/${uuid.v4()}`,
    {
      body: commentBody,
      headers: authHeader(session.id)
    }
  );
  t.equal(comment[0].status, 201, 'Comment creation succeeds');
  const taskComment = await get(
    `/tasks/${task[1].id}/comments`,
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
});
