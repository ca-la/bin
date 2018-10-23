import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import * as TaskEventsDAO from '../../dao/task-events';
import * as ProductDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as TasksDAO from '../../dao/tasks';
import * as UserTasksDAO from '../../dao/user-tasks';
import UserTask from '../../domain-objects/user-task';
import PublicUser from '../../domain-objects/public-user';
import TaskEvent, { TaskStatus } from '../../domain-objects/task-event';
import { hasOnlyProperties } from '../../services/require-properties';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

type IOTask = Omit<TaskEvent, 'taskId'> & { assignees: PublicUser[] };
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
    'designStageId',
    'assignees'
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
  const filteredRequest = omit(request, ['assignees']);
  return Object.assign({}, filteredRequest, {
    createdAt: new Date(),
    createdBy: userId,
    id: uuid.v4(),
    status: request.status || TaskStatus.NOT_STARTED,
    taskId: request.id
  });
};

const ioFromTaskEvent = (taskEvent: TaskEvent, assignees: PublicUser[] = []): IOTask => {
  return {
    assignees,
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
  const assignees = yield UserTasksDAO.findAllUsersByTaskId(this.params.taskId);

  this.status = 200;
  this.body = ioFromTaskEvent(task, assignees);
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

  const ioAndAssigneesFromTaskEvent = async (task: TaskEvent): Promise<object> => {
    const assignees = await UserTasksDAO.findAllUsersByTaskId(task.id);
    return ioFromTaskEvent(task, assignees);
  };

  this.status = 200;
  this.body = yield tasks.map(ioAndAssigneesFromTaskEvent);
}

router.post('/', requireAuth, createTaskWithEvent);
router.put('/:taskId', requireAuth, createTaskEvent);
router.put('/:taskId/assignees', requireAuth, updateTaskAssignment);
router.post('/stage/:stageId', requireAuth, createTaskWithEventOnStage);

router.get('/', requireAuth, getList);
router.get('/:taskId', requireAuth, getTaskEvent);

export = router.routes();
