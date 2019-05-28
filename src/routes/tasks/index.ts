import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';
import { omit, pick } from 'lodash';

import * as TaskEventsDAO from '../../dao/task-events';
import * as ProductDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as TasksDAO from '../../dao/tasks';
import * as CommentDAO from '../../components/comments/dao';
import * as TaskCommentDAO from '../../dao/task-comments';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import CollaboratorTask from '../../domain-objects/collaborator-task';
import TaskEvent, {
  DetailsTask,
  DetailsTaskWithAssignees,
  TaskStatus
} from '../../domain-objects/task-event';
import Comment, {
  BASE_COMMENT_PROPERTIES,
  isBaseComment
} from '../../components/comments/domain-object';
import { hasOnlyProperties } from '../../services/require-properties';
import requireAuth = require('../../middleware/require-auth');
import Collaborator, {
  CollaboratorWithUser
} from '../../components/collaborators/domain-objects/collaborator';
import * as NotificationsService from '../../services/create-notifications';
import { typeGuard } from '../../middleware/type-guard';
import addAtMentionDetails from '../../services/add-at-mention-details';
import parseAtMentions, {
  MentionType
} from '@cala/ts-lib/dist/parsing/comment-mentions';
import { announceTaskCommentCreation } from '../../components/iris/messages/task-comment';

const router = new Router();

type IOTask = DetailsTask & { assignees: Collaborator[] };
interface CollaboratorTaskRequest {
  collaboratorIds: string[];
}

function addDefaultOrdering(task: IOTask): IOTask {
  return { ...task, ordering: Object(task).ordering || 0 };
}

function isIOTask(candidate: object): candidate is IOTask {
  return (
    hasOnlyProperties(
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
      'ordering',
      'design',
      'designStage',
      'collection',
      'commentCount'
    ) || // TODO: Remove this check once studio is using new model for tasks and passes
    hasOnlyProperties(
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
    )
  );
}

function isCollaboratorTaskRequest(
  candidate: object
): candidate is CollaboratorTaskRequest {
  return hasOnlyProperties(candidate, 'collaboratorIds');
}

const taskEventFromIO = (request: IOTask, userId: string): TaskEvent => {
  const filteredRequest = omit(
    request,
    'assignees',
    'design',
    'designStage',
    'collection',
    'commentCount'
  );
  return Object.assign({}, filteredRequest, {
    createdAt: new Date(),
    createdBy: userId,
    id: uuid.v4(),
    status: request.status || TaskStatus.NOT_STARTED,
    taskId: request.id
  });
};

function* createTaskWithEvent(
  this: Koa.Application.Context<IOTask>
): AsyncIterableIterator<DetailsTask> {
  const body = addDefaultOrdering(this.request.body);
  yield TasksDAO.create(body.id);
  const taskEvent: DetailsTaskWithAssignees = yield TaskEventsDAO.create(
    taskEventFromIO(body, this.state.userId)
  );

  this.body = taskEvent;
  this.status = 201;
}

function* createTaskEvent(
  this: Koa.Application.Context<IOTask>
): AsyncIterableIterator<DetailsTask> {
  const { userId: sessionUserId } = this.state;
  const body = addDefaultOrdering(this.request.body);
  const taskId = body.id;
  const previousState: DetailsTaskWithAssignees = yield TaskEventsDAO.findById(
    taskId
  );
  const taskEvent: DetailsTaskWithAssignees = yield TaskEventsDAO.create(
    taskEventFromIO(body, this.state.userId)
  );
  const updateDidCompleteTask =
    taskEvent.status === TaskStatus.COMPLETED &&
    previousState.status !== TaskStatus.COMPLETED;
  if (updateDidCompleteTask) {
    NotificationsService.sendTaskCompletionNotification(taskId, sessionUserId);
  }

  this.body = taskEvent;
  this.status = 201;
}

function* createTaskWithEventOnStage(
  this: Koa.Application.Context<IOTask>
): AsyncIterableIterator<DetailsTask> {
  const body = addDefaultOrdering(this.request.body);
  const stageId = this.params.stageId;
  yield TasksDAO.create(body.id);
  yield TaskEventsDAO.create(taskEventFromIO(body, this.state.userId));
  yield ProductDesignStageTasksDAO.create({
    designStageId: stageId,
    taskId: body.id
  });
  const taskEvent: DetailsTaskWithAssignees = yield TaskEventsDAO.findById(
    body.id
  );
  this.body = taskEvent;
  this.status = 201;
}

function* getTaskEvent(
  this: Koa.Application.Context
): AsyncIterableIterator<DetailsTaskWithAssignees> {
  const task = yield TaskEventsDAO.findById(this.params.taskId);
  if (!task) {
    return this.throw(400, 'Task was not found');
  }

  this.status = 200;
  this.body = task;
}

function* updateTaskAssignment(
  this: Koa.Application.Context
): AsyncIterableIterator<DetailsTask> {
  const { taskId } = this.params;
  const { body } = this.request;
  const { userId: sessionUserId } = this.state;

  if (body && isCollaboratorTaskRequest(body)) {
    const { collaboratorIds } = body;
    const existingRelationships = yield CollaboratorTasksDAO.findAllByTaskId(
      taskId
    );

    const existingCollaboratorIds: string[] = existingRelationships.map(
      (collaboratorTask: CollaboratorTask) => {
        return collaboratorTask.collaboratorId;
      }
    );
    const newIds = collaboratorIds.filter((collaboratorId: string) => {
      return !existingCollaboratorIds.find(
        (existingId: string) => collaboratorId === existingId
      );
    });
    const existingIdsToDelete = existingCollaboratorIds.filter(
      (existingId: string) => {
        return !collaboratorIds.find(
          (collaboratorId: string) => collaboratorId === existingId
        );
      }
    );

    yield CollaboratorTasksDAO.deleteAllByCollaboratorIdsAndTaskId(
      existingIdsToDelete,
      taskId
    );

    if (newIds.length > 0) {
      yield CollaboratorTasksDAO.createAllByCollaboratorIdsAndTaskId(
        newIds,
        taskId
      );
      NotificationsService.sendTaskAssignmentNotification(
        taskId,
        sessionUserId,
        newIds
      );
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
  assignFilterUserId?: string;
  stageFilter?: string;
  limit?: number;
  offset?: number;
}

function* getList(
  this: Koa.Application.Context
): AsyncIterableIterator<DetailsTask[]> {
  const query: GetListQuery = this.query;
  const {
    collectionId,
    stageId,
    userId,
    assignFilterUserId,
    stageFilter,
    limit,
    offset
  } = query;
  if (!collectionId && !stageId && !userId) {
    return this.throw('Missing collectionId, stageId, or userId');
  }

  let tasks: DetailsTask[] = [];
  if (collectionId) {
    tasks = yield TaskEventsDAO.findByCollectionId(collectionId, limit, offset);
  } else if (stageId) {
    tasks = yield TaskEventsDAO.findByStageId(stageId, limit, offset);
  } else if (userId) {
    tasks = yield TaskEventsDAO.findByUserId(userId, {
      assignFilterUserId,
      limit,
      offset,
      stageFilter
    });
  }

  this.status = 200;
  this.body = tasks;
}

function* createTaskComment(
  this: Koa.Application.Context
): AsyncIterableIterator<Comment> {
  const { userId } = this.state;
  const body = omit(this.request.body, 'mentions');
  const { taskId } = this.params;
  const filteredBody = pick(body, BASE_COMMENT_PROPERTIES);

  if (filteredBody && isBaseComment(filteredBody) && taskId) {
    const comment = yield CommentDAO.create({ ...filteredBody, userId });
    const taskComment = yield TaskCommentDAO.create({
      commentId: comment.id,
      taskId
    });
    const mentions = parseAtMentions(filteredBody.text);
    const mentionedUserIds: string[] = [];
    for (const mention of mentions) {
      switch (mention.type) {
        case MentionType.collaborator: {
          const collaborator: CollaboratorWithUser = yield CollaboratorsDAO.findById(
            mention.id
          );
          if (collaborator && collaborator.user) {
            yield NotificationsService.sendTaskCommentMentionNotification(
              taskId,
              comment.id,
              userId,
              collaborator.user.id
            );
            mentionedUserIds.push(collaborator.user.id);
          }
        }
      }
    }
    yield announceTaskCommentCreation(taskComment, comment);
    yield NotificationsService.sendTaskCommentCreateNotification(
      taskId,
      comment.id,
      userId,
      mentionedUserIds
    );

    this.status = 201;
    this.body = comment;
  } else {
    this.throw(
      400,
      `Request does not match task comment model: ${Object.keys(body || {})}`
    );
  }
}

function* getTaskComments(
  this: Koa.Application.Context
): AsyncIterableIterator<Comment[]> {
  const comments = yield TaskCommentDAO.findByTaskId(this.params.taskId);
  if (comments) {
    const commentsWithMentions = yield addAtMentionDetails(comments);
    this.status = 200;
    this.body = commentsWithMentions;
  } else {
    this.throw(404);
  }
}

router.post('/', requireAuth, typeGuard<IOTask>(isIOTask), createTaskWithEvent);
router.put(
  '/:taskId',
  requireAuth,
  typeGuard<IOTask>(isIOTask),
  createTaskEvent
);
router.put('/:taskId/assignees', requireAuth, updateTaskAssignment);
router.post('/stage/:stageId', requireAuth, createTaskWithEventOnStage);

router.get('/', requireAuth, getList);
router.get('/:taskId', requireAuth, getTaskEvent);

router.put('/:taskId/comments/:commentId', requireAuth, createTaskComment);
router.get('/:taskId/comments', requireAuth, getTaskComments);

export = router.routes();
