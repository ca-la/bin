import Knex from 'knex';

import uuid from 'node-uuid';
import { TaskEvent, TaskStatus } from '@cala/ts-lib';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import * as TasksDAO from '../../dao/tasks';
import * as TaskEventsDAO from '../../dao/task-events';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import * as ProductDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import db from '../../services/db';

import createTask from './index';
import createDesign from '../create-design';

test('createTask with no stage', async (t: Test) => {
  const taskId = uuid.v4();
  const taskEvent: TaskEvent = {
    dueDate: null,
    status: TaskStatus.NOT_STARTED,
    title: 'A task',
    description: 'A task has no description',
    createdBy: null,
    taskId,
    createdAt: new Date(),
    id: uuid.v4(),
    designStageId: null,
    ordering: 0
  };

  const stageTasksCreateSpy = sandbox().spy(
    ProductDesignStageTasksDAO,
    'create'
  );

  await createTask(taskId, taskEvent);

  t.ok(!stageTasksCreateSpy.called);
  t.equal((await TasksDAO.findById(taskId))!.id, taskId);
  t.equal(
    (await db.transaction((trx: Knex.Transaction) =>
      TaskEventsDAO.findById(trx, taskId)
    ))!.id,
    taskId
  );

  const failedTaskId = uuid.v4();
  const failedTaskEvent = {
    ...taskEvent,
    taskId: failedTaskId
  };
  sandbox()
    .stub(TaskEventsDAO, 'create')
    .rejects();

  try {
    await createTask(failedTaskId, failedTaskEvent);
    t.fail('Resolved instead of rejecting!');
  } catch (e) {
    t.pass('Rejects the promise');
  }

  t.equal(await TasksDAO.findById(failedTaskId), null);
});

test('createTask with stage', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
    productType: 'test',
    title: 'design',
    userId: user.id
  });
  const stages = await ProductDesignStagesDAO.findAllByDesignId(design.id);
  const taskId = uuid.v4();
  const taskEvent: TaskEvent = {
    dueDate: null,
    status: TaskStatus.NOT_STARTED,
    title: 'A task',
    description: 'A task has no description',
    createdBy: null,
    taskId,
    createdAt: new Date(),
    id: uuid.v4(),
    designStageId: null,
    ordering: 0
  };

  const stageTasksCreateSpy = sandbox().spy(
    ProductDesignStageTasksDAO,
    'create'
  );

  await createTask(taskId, taskEvent, stages[0].id);

  t.ok(stageTasksCreateSpy.called);
  t.equal((await TasksDAO.findById(taskId))!.id, taskId);
  t.equal(
    (await db.transaction((trx: Knex.Transaction) =>
      TaskEventsDAO.findById(trx, taskId)
    ))!.id,
    taskId
  );
  t.equal(
    (await ProductDesignStageTasksDAO.findByTaskId(taskId))!.taskId,
    taskId
  );

  const failedTaskId = uuid.v4();
  const failedTaskEvent = {
    ...taskEvent,
    taskId: failedTaskId
  };
  sandbox()
    .stub(TaskEventsDAO, 'create')
    .rejects();

  try {
    await createTask(failedTaskId, failedTaskEvent, stages[0].id);
    t.fail('Resolved instead of rejecting!');
  } catch (e) {
    t.pass('Rejects the promise');
  }

  t.equal(await TasksDAO.findById(failedTaskId), null);
  t.equal(await ProductDesignStageTasksDAO.findByTaskId(failedTaskId), null);
});
