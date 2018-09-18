import * as taskEventsDAO from '../../dao/task-events';
import * as tasksDAO from '../../dao/tasks';
import * as collectionStageTasksDAO from '../../dao/collection-stage-tasks';
import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, get, post } from '../../test-helpers/http';
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
  t.equal(body.taskId, taskId);
});

test('GET /tasks/collection/:collectionId returns tasks on collection', async (t: tape.Test) => {
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

  const [response, body] = await get(`/tasks/collection/${collectionId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body[0].taskId, taskId);
});

test('GET /tasks/stage/:stageId returns tasks on collection stage', async (t: tape.Test) => {
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

  const [response, body] = await get(`/tasks/stage/${stageId}`, {
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.equal(body[0].taskId, taskId);
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
    body: { status: null, title: '', dueDate: null },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
});

test('POST /tasks/:taskId creates TaskEvent successfully', async (t: tape.Test) => {
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

  const [response, body] = await post(`/tasks/${taskId}`, {
    body: { status: null, title: '', dueDate: null },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.taskId, taskId);
});

test('POST /tasks/stage/:stageId creates Task and TaskEvent successfully', async (t: tape.Test) => {
  const { session, user } = await createUser();

  const taskId = uuid.v4();

  sandbox().stub(tasksDAO, 'create').returns(Promise.resolve(
    {
      id: taskId
    }
  ));

  sandbox().stub(collectionStageTasksDAO, 'create').returns(Promise.resolve(
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

  const [response, body] = await post(`/tasks/${taskId}`, {
    body: { status: null, title: '', dueDate: null },
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.equal(body.taskId, taskId);
});
