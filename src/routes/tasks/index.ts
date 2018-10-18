import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import * as TaskEventsDAO from '../../dao/task-events';
import * as ProductDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as TasksDAO from '../../dao/tasks';
import * as UserTasksDAO from '../../dao/user-tasks';
import UserTask from '../../domain-objects/user-task';
import TaskEvent, { TaskStatus } from '../../domain-objects/task-event';
import { hasOnlyProperties } from '../../services/require-properties';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

type IOTask = Omit<TaskEvent, 'taskId'>;
interface UserTaskRequest {
  userIds: string[];
}

function isIOTask(candidate: object): candidate is IOTask {
  return hasOnlyProperties(
    candidate,
    'dueDate',
    'status',
    'title',
    'description',
    'createdBy',
    'createdAt',
    'id',
    'designStageId'
  );
}

function isUserTaskRequest(candidate: object): candidate is UserTaskRequest {
  return hasOnlyProperties(
    candidate,
    'userIds'
  );
}

const taskEventFromIO = (
  request: IOTask,
  userId: string
): TaskEvent => {
  return Object.assign({}, request, {
    createdAt: new Date(),
    createdBy: userId,
    id: uuid.v4(),
    status: request.status || TaskStatus.NOT_STARTED,
    taskId: request.id
  });
};

const ioFromTaskEvent = (taskEvent: TaskEvent): IOTask => {
  return {
    createdAt: taskEvent.createdAt,
    createdBy: taskEvent.createdBy,
    description: taskEvent.description,
    designStageId: taskEvent.designStageId,
    dueDate: taskEvent.dueDate,
    id: taskEvent.taskId,
    status: taskEvent.status,
    title: taskEvent.title
  };
};

function* createTaskWithEvent(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const body = this.request.body;
  if (body && isIOTask(body)) {
    yield TasksDAO.create(body.id);
    const taskEvent: TaskEvent = yield TaskEventsDAO
      .create(taskEventFromIO(body, this.state.userId));

    this.body = ioFromTaskEvent(taskEvent);
    this.status = 201;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

function* createTaskEvent(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const body = this.request.body;
  if (body && isIOTask(body)) {
    const taskEvent: TaskEvent = yield TaskEventsDAO
      .create(taskEventFromIO(body, this.state.userId));

    this.body = ioFromTaskEvent(taskEvent);
    this.status = 201;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

function* createTaskWithEventOnStage(
  this: Koa.Application.Context
): AsyncIterableIterator<TaskEvent> {
  const body = this.request.body;
  if (body && isIOTask(body)) {
    const stageId = this.params.stageId;
    yield TasksDAO.create(body.id);
    const newTaskEvent: TaskEvent = yield TaskEventsDAO
      .create(taskEventFromIO(body, this.state.userId));
    yield ProductDesignStageTasksDAO.create({
      designStageId: stageId,
      taskId: newTaskEvent.taskId
    });
    const taskEvent: TaskEvent = {
      ...newTaskEvent,
      designStageId: stageId
    };
    this.body = ioFromTaskEvent(taskEvent);
    this.status = 201;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

function* getTaskEvent(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const task = yield TaskEventsDAO.findById(this.params.taskId);

  this.status = 200;
  this.body = ioFromTaskEvent(task);
}

function* updateTaskAssignment(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const { taskId } = this.params;
  const body = this.request.body;
  if (body && isUserTaskRequest(body)) {
    const { userIds } = body;
    const existingRelationships = yield UserTasksDAO.findAllByTaskId(taskId);
    const existingUserIds: string[] = existingRelationships.map((userTask: UserTask) => {
      return userTask.userId;
    });
    const newIds = userIds.filter((userId: string) => {
      return !existingUserIds.find((existingId: string) => userId === existingId);
    });
    const existingIdsToDelete = existingUserIds.filter((existingId: string) => {
      return !userIds.find((userId: string) => userId === existingId);
    });

    yield UserTasksDAO.deleteAllByUserIdsAndTaskId(existingIdsToDelete, taskId);
    const newUserTasks: UserTask[] = yield UserTasksDAO
      .createAllByUserIdsAndTaskId(newIds, taskId);

    this.status = 200;
    this.body = newUserTasks;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

interface GetListQuery {
  collectionId?: string;
  stageId?: string;
  userId?: string;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const query: GetListQuery = this.query;
  if (!query.collectionId && !query.stageId && !query.userId) {
    return this.throw('Missing collectionId, stageId, or userId');
  }

  let tasks: TaskEvent[] = [];
  if (query.collectionId) {
    tasks = yield TaskEventsDAO.findByCollectionId(query.collectionId);
  } else if (query.stageId) {
    tasks = yield TaskEventsDAO.findByStageId(query.stageId);
  }  else if (query.userId) {
    tasks = yield TaskEventsDAO.findByUserId(query.userId);
  }

  this.status = 200;
  this.body = tasks.map(ioFromTaskEvent);
}

router.post('/', requireAuth, createTaskWithEvent);
router.put('/:taskId', requireAuth, createTaskEvent);
router.put('/:taskId/assignees', requireAuth, updateTaskAssignment);
router.post('/stage/:stageId', requireAuth, createTaskWithEventOnStage);

router.get('/', requireAuth, getList);
router.get('/:taskId', requireAuth, getTaskEvent);

export = router.routes();
