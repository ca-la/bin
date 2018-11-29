import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import * as TaskEventsDAO from '../../dao/task-events';
import * as ProductDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as TasksDAO from '../../dao/tasks';
import * as CommentDAO from '../../dao/comments';
import * as TaskCommentDAO from '../../dao/task-comments';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as CollaboratorsDAO from '../../dao/collaborators';
import CollaboratorTask from '../../domain-objects/collaborator-task';
import TaskEvent, { TaskStatus } from '../../domain-objects/task-event';
import Comment, { isComment } from '../../domain-objects/comment';
import { hasOnlyProperties } from '../../services/require-properties';
import requireAuth = require('../../middleware/require-auth');
import { Collaborator } from '../../domain-objects/collaborator';
import { sendTaskCommentCreateNotification } from '../../services/create-notifications';

const router = new Router();

type IOTask = Omit<TaskEvent, 'taskId'> & { assignees: Collaborator[] };
interface CollaboratorTaskRequest {
  collaboratorIds: string[];
}

function addDefaultOrdering(task: object): object {
  return { ...task, ordering: Object(task).ordering || 0 };
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
    'assignees',
    'ordering'
  );
}

function isCollaboratorTaskRequest(candidate: object): candidate is CollaboratorTaskRequest {
  return hasOnlyProperties(
    candidate,
    'collaboratorIds'
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

const ioFromTaskEvent = (taskEvent: TaskEvent, assignees: Collaborator[] = []): IOTask => {
  return {
    assignees,
    createdAt: taskEvent.createdAt,
    createdBy: taskEvent.createdBy,
    description: taskEvent.description,
    designStageId: taskEvent.designStageId,
    dueDate: taskEvent.dueDate,
    id: taskEvent.taskId,
    ordering: taskEvent.ordering,
    status: taskEvent.status,
    title: taskEvent.title
  };
};

function* createTaskWithEvent(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const body = addDefaultOrdering(this.request.body);
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
  const body = addDefaultOrdering(this.request.body);
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
  const body = addDefaultOrdering(this.request.body);
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
  const assignees = yield CollaboratorsDAO.findByTask(this.params.taskId);

  this.status = 200;
  this.body = ioFromTaskEvent(task, assignees);
}

function* updateTaskAssignment(this: Koa.Application.Context): AsyncIterableIterator<TaskEvent> {
  const { taskId } = this.params;
  const body = this.request.body;
  if (body && isCollaboratorTaskRequest(body)) {
    const { collaboratorIds } = body;
    const existingRelationships = yield CollaboratorTasksDAO.findAllByTaskId(taskId);

    const existingCollaboratorIds: string[] = existingRelationships
      .map((collaboratorTask: CollaboratorTask) => {
        return collaboratorTask.collaboratorId;
      });
    const newIds = collaboratorIds.filter((collaboratorId: string) => {
      return !existingCollaboratorIds.find((existingId: string) => collaboratorId === existingId);
    });
    const existingIdsToDelete = existingCollaboratorIds.filter((existingId: string) => {
      return !collaboratorIds.find((collaboratorId: string) => collaboratorId === existingId);
    });

    yield CollaboratorTasksDAO.deleteAllByCollaboratorIdsAndTaskId(existingIdsToDelete, taskId);

    if (newIds.length > 0) {
      yield CollaboratorTasksDAO.createAllByCollaboratorIdsAndTaskId(newIds, taskId);
    }

    this.status = 200;
    this.body = yield CollaboratorTasksDAO.findAllByTaskId(taskId);
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
    const assignees = await CollaboratorsDAO.findByTask(task.taskId);
    return ioFromTaskEvent(task, assignees);
  };

  this.status = 200;
  this.body = yield tasks.map(ioAndAssigneesFromTaskEvent);
}

function* createTaskComment(this: Koa.Application.Context): AsyncIterableIterator<Comment> {
  const { userId } = this.state;
  const { body } = this.request;
  const { taskId } = this.params;

  if (body && isComment(body) && taskId) {
    const comment = yield CommentDAO.create({ ...body, userId });
    yield TaskCommentDAO.create({ commentId: comment.id, taskId });
    yield sendTaskCommentCreateNotification(taskId, comment.id, userId);

    this.status = 201;
    this.body = comment;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

function* getTaskComments(this: Koa.Application.Context): AsyncIterableIterator<Comment[]> {
  const comments = yield TaskCommentDAO.findByTaskId(this.params.taskId);
  if (comments) {
    this.status = 200;
    this.body = comments;
  } else {
    this.throw(404);
  }
}

router.post('/', requireAuth, createTaskWithEvent);
router.put('/:taskId', requireAuth, createTaskEvent);
router.put('/:taskId/assignees', requireAuth, updateTaskAssignment);
router.post('/stage/:stageId', requireAuth, createTaskWithEventOnStage);

router.get('/', requireAuth, getList);
router.get('/:taskId', requireAuth, getTaskEvent);

router.put('/:taskId/comments/:commentId', requireAuth, createTaskComment);
router.get('/:taskId/comments', requireAuth, getTaskComments);

export = router.routes();
