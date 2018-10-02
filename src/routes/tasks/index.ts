import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import * as TaskEventsDAO from '../../dao/task-events';
import * as ProductDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as TasksDAO from '../../dao/tasks';
import TaskEvent, {
  isTaskEventRequest,
  TaskEventRequest,
  TaskStatus
} from '../../domain-objects/task-event';
import Task from '../../domain-objects/task';
import ProductDesignStageTask from '../../domain-objects/product-design-stage-task';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

const taskEventFromRequest = (
  request: TaskEventRequest,
  taskId: string,
  userId: string
): TaskEvent => {
  return Object.assign(request, {
    createdAt: new Date(),
    createdBy: userId,
    id: uuid.v4(),
    status: request.status || TaskStatus.NOT_STARTED,
    taskId
  });
};

function* createTaskWithEvent(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  if (this.request.body && isTaskEventRequest(this.request.body)) {
    const body = this.request.body;
    const taskEvent: TaskEvent = yield TasksDAO.create().then((task: Task): Promise<TaskEvent> => {
      return TaskEventsDAO
        .create(taskEventFromRequest(body, task.id, this.state.userId));
    });

    this.body = taskEvent;
    this.status = 201;
  } else {
    this.throw(400, 'Request does not match TaskEvent model');
  }
}

function* createTaskEvent(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  if (this.request.body && isTaskEventRequest(this.request.body)) {
    const body = this.request.body;
    const taskEvent: TaskEvent = yield TaskEventsDAO
      .create(taskEventFromRequest(body, this.params.taskId, this.state.userId));

    this.body = taskEvent;
    this.status = 201;
  } else {
    this.throw(400, 'Request does not match TaskEvent model');
  }
}

function* createTaskWithEventOnStage(
  this: Koa.Application.Context
): AsyncIterableIterator<TaskEvent> {
  if (this.request.body && isTaskEventRequest(this.request.body)) {
    const body = this.request.body;
    const stageId = this.params.stageId;
    let taskEv: TaskEvent;
    const taskEvent: TaskEvent = yield TasksDAO.create()
      .then((task: Task): Promise<TaskEvent> => {
        return TaskEventsDAO
          .create(taskEventFromRequest(body, task.id, this.state.userId));
      }).then((newTaskEvent: TaskEvent): Promise<ProductDesignStageTask> => {
        taskEv = newTaskEvent;
        return ProductDesignStageTasksDAO.create({
          designStageId: stageId,
          taskId: newTaskEvent.taskId
        });
      }).then((): Promise<TaskEvent> => {
        return Promise.resolve(taskEv);
      });

    this.body = taskEvent;
    this.status = 201;
  } else {
    this.throw(400, 'Request does not match TaskEvent model');
  }
}

function* getTaskEvent(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const tasks = yield TaskEventsDAO.findById(this.params.taskId);

  this.status = 200;
  this.body = tasks;
}

interface GetListQuery {
  collectionId?: string;
  stageId?: string;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const query: GetListQuery = this.query;
  if (!query.collectionId && !query.stageId) {
    return this.throw('Missing collectionId or stageId');
  }

  let tasks;
  if (query.collectionId) {
    tasks = yield TaskEventsDAO.findByCollectionId(query.collectionId);
  } else if (query.stageId) {
    tasks = yield TaskEventsDAO.findByStageId(query.stageId);
  }

  this.status = 200;
  this.body = tasks;
}

router.post('/', requireAuth, createTaskWithEvent);
router.post('/:taskId', requireAuth, createTaskEvent);
router.post('/stage/:stageId', requireAuth, createTaskWithEventOnStage);

router.get('/', requireAuth, getList);
router.get('/:taskId', requireAuth, getTaskEvent);

export = router.routes();
