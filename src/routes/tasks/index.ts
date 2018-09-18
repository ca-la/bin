import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import * as TaskEventsDAO from '../../dao/task-events';
import * as CollectionStageTasksDAO from '../../dao/collection-stage-tasks';
import * as TasksDAO from '../../dao/tasks';
import TaskEvent, {
  isTaskEventRequest,
  TaskEventRequest,
  TaskStatus
} from '../../domain-objects/task-event';
import Task from '../../domain-objects/task';
import CollectionStageTask from '../../domain-objects/collection-stage-task';
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
      }).then((newTaskEvent: TaskEvent): Promise<CollectionStageTask> => {
        taskEv = newTaskEvent;
        return CollectionStageTasksDAO.create({
          collectionStageId: stageId,
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

function* getTasksForCollection(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const tasks = yield TaskEventsDAO.findByCollectionId(this.params.collectionId);

  this.status = 200;
  this.body = tasks;
}

function* getTasksForCollectionStage(
  this: Koa.Application.Context
): AsyncIterableIterator<TaskEvent> {
  const tasks = yield TaskEventsDAO.findByStageId(this.params.stageId);

  this.status = 200;
  this.body = tasks;
}

router.post('/', requireAuth, createTaskWithEvent);
router.post('/:taskId', requireAuth, createTaskEvent);
router.post('/stage/:stageId', requireAuth, createTaskWithEventOnStage);

router.get('/:taskId', requireAuth, getTaskEvent);
router.get('/collection/:collectionId', requireAuth, getTasksForCollection);
router.get('/stage/:stageId', requireAuth, getTasksForCollectionStage);

export = router.routes();
