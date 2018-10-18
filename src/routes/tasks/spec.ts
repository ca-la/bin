import * as taskEventsDAO from '../../dao/task-events';
import * as tasksDAO from '../../dao/tasks';
import * as productDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, get, post, put } from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';

test('GET /tasks/:taskId returns Task', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const taskId = uuid.v4();

  sandbox().stub(taskEventsDAO, 'findById').returns(Promise.resolve(
    {
      createdAt: '',
      createdBy: user.id,
      dueDate: '',
      id: taskId,
      status: '',
      taskId,
      title: ''
    }
  ));

  const [response, body] = await get(`/tasks/${taskId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body.id, taskId);
});

test('GET /tasks?collectionId=:collectionId returns tasks on collection', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const collectionId = uuid.v4();
  const taskId = uuid.v4();

  sandbox().stub(taskEventsDAO, 'findByCollectionId').returns(Promise.resolve([
    {
      createdAt: '',
      createdBy: user.id,
      dueDate: '',
      id: taskId,
      status: '',
      taskId,
      title: ''
    }
  ]));

  const [response, body] = await get(`/tasks?collectionId=${collectionId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body[0].id, taskId);
});

test('GET /tasks?stageId=:stageId returns tasks on design stage', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const stageId = uuid.v4();
  const taskId = uuid.v4();

  sandbox().stub(taskEventsDAO, 'findByStageId').returns(Promise.resolve([
    {
      createdAt: '',
      createdBy: user.id,
      dueDate: '',
      id: taskId,
      status: '',
      taskId,
      title: ''
    }
  ]));

  const [response, body] = await get(`/tasks?stageId=${stageId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body[0].id, taskId);
});

test('GET /tasks?userId=:userId returns all tasks for a user', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const taskId = uuid.v4();

  sandbox().stub(taskEventsDAO, 'findByUserId').returns(Promise.resolve([
    {
      createdAt: '',
      createdBy: user.id,
      dueDate: '',
      id: taskId,
      status: '',
      taskId,
      title: ''
    }
  ]));

  const [response, body] = await get(`/tasks?userId=${user.id}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body[0].id, taskId);
});

test('POST /tasks creates Task and TaskEvent successfully', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const taskId = uuid.v4();

  sandbox().stub(tasksDAO, 'create').returns(Promise.resolve(
    {
      id: taskId
    }
  ));

  sandbox().stub(taskEventsDAO, 'create').returns(Promise.resolve(
    {
      createdAt: '',
      createdBy: user.id,
      dueDate: '',
      id: taskId,
      status: '',
      taskId,
      title: ''
    }
  ));

  const [response] = await post('/tasks', {
    body: {
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
  const eventId = uuid.v4();

  sandbox().stub(tasksDAO, 'create').returns(Promise.resolve(
    {
      id: taskId
    }
  ));

  sandbox().stub(taskEventsDAO, 'create').returns(Promise.resolve(
    {
      createdAt: '',
      createdBy: user.id,
      dueDate: '',
      id: eventId,
      status: '',
      taskId,
      title: ''
    }
  ));

  const [response, body] = await put(`/tasks/${taskId}`, {
    body: {
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
  const task = await tasksDAO.create(uuid.v4());

  const [response, body] = await put(`/tasks/${task.id}/assignees`, {
    body: { userIds: [user.id] },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body.length, 1);
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
      createdAt: '',
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
