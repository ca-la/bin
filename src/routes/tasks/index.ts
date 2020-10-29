import Router from "koa-router";
import { omit, pick } from "lodash";
import { BaseComment, TaskEvent, TaskStatus } from "@cala/ts-lib";
import Knex from "knex";

import * as TaskEventsDAO from "../../dao/task-events";
import * as TaskCommentDAO from "../../components/task-comments/dao";
import * as CollaboratorTasksDAO from "../../dao/collaborator-tasks";
import * as NotificationsService from "../../services/create-notifications";
import CollaboratorTask from "../../domain-objects/collaborator-task";
import createTask from "../../services/create-task";
import {
  DetailsTask,
  DetailsTaskWithAssignees,
  IOTask,
  taskEventFromIO,
} from "../../domain-objects/task-event";
import {
  BASE_COMMENT_PROPERTIES,
  isBaseComment,
} from "../../components/comments/domain-object";
import {
  hasOnlyProperties,
  hasProperties,
} from "../../services/require-properties";
import requireAuth = require("../../middleware/require-auth");
import { typeGuard } from "../../middleware/type-guard";
import addAtMentionDetails, {
  getCollaboratorsFromCommentMentions,
  getThreadUserIdsFromCommentThread,
} from "../../services/add-at-mention-details";
import { announceTaskCommentCreation } from "../../components/iris/messages/task-comment";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import db from "../../services/db";
import Asset from "../../components/assets/types";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import useTransaction from "../../middleware/use-transaction";

const router = new Router();

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
      "dueDate",
      "status",
      "title",
      "description",
      "createdBy",
      "createdAt",
      "id",
      "designStageId",
      "assignees",
      "ordering",
      "design",
      "designStage",
      "collection",
      "commentCount",
      "lastModifiedAt"
    ) || // TODO: Remove this check once studio is using new model for tasks and passes
    hasProperties(
      candidate,
      "dueDate",
      "status",
      "title",
      "description",
      "createdBy",
      "createdAt",
      "id",
      "designStageId",
      "assignees",
      "ordering"
    )
  );
}

function isCollaboratorTaskRequest(
  candidate: object
): candidate is CollaboratorTaskRequest {
  return hasOnlyProperties(candidate, "collaboratorIds");
}

function* createTaskWithEvent(
  this: AuthedContext<IOTask>
): Iterator<any, any, any> {
  const taskId = this.request.body.id;
  const taskEvent = taskEventFromIO(
    addDefaultOrdering(this.request.body),
    this.state.userId
  );
  const created = yield createTask(taskId, taskEvent);

  this.body = created;
  this.status = 201;
}

function* createTaskEvent(
  this: AuthedContext<IOTask>
): Iterator<any, any, any> {
  const { userId: sessionUserId } = this.state;
  const body = addDefaultOrdering(this.request.body);
  const taskId = body.id;

  yield db.transaction(async (trx: Knex.Transaction) => {
    const previousState: TaskEvent | null = await TaskEventsDAO.findRawById(
      trx,
      taskId
    );

    const taskEvent: {
      id: string;
      status: TaskStatus | null;
    } = await TaskEventsDAO.create(
      taskEventFromIO(body, this.state.userId),
      trx
    );
    const updateDidCompleteTask =
      previousState &&
      previousState.status !== TaskStatus.COMPLETED &&
      taskEvent.status === TaskStatus.COMPLETED;
    if (updateDidCompleteTask) {
      await NotificationsService.sendTaskCompletionNotification(
        trx,
        taskId,
        sessionUserId
      );
    }
  });
  this.status = 204;
}

function* createTaskWithEventOnStage(
  this: AuthedContext<IOTask>
): Iterator<any, any, any> {
  const taskId = this.request.body.id;
  const stageId = this.params.stageId;
  const taskEvent = taskEventFromIO(
    addDefaultOrdering(this.request.body),
    this.state.userId
  );
  yield createTask(taskId, taskEvent, stageId);

  const taskEventWithAssignees: DetailsTaskWithAssignees = yield db.transaction(
    (trx: Knex.Transaction) => TaskEventsDAO.findById(trx, taskId)
  );
  this.body = taskEventWithAssignees;
  this.status = 201;
}

function* getTaskEvent(this: AuthedContext): Iterator<any, any, any> {
  const task = yield db.transaction((trx: Knex.Transaction) =>
    TaskEventsDAO.findById(trx, this.params.taskId)
  );
  if (!task) {
    this.throw(400, "Task was not found");
  }

  this.status = 200;
  this.body = task;
}

function* updateTaskAssignment(
  this: AuthedContext<CollaboratorTaskRequest>
): Iterator<any, any, any> {
  const { taskId } = this.params;
  const { body } = this.request;
  const { userId: sessionUserId } = this.state;

  if (body && isCollaboratorTaskRequest(body)) {
    const collaboratorTasks = yield db.transaction(
      async (trx: Knex.Transaction) => {
        const { collaboratorIds } = body;
        const existingRelationships = await CollaboratorTasksDAO.findAllByTaskId(
          trx,
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

        await CollaboratorTasksDAO.deleteAllByCollaboratorIdsAndTaskId(
          existingIdsToDelete,
          taskId
        );

        if (newIds.length > 0) {
          await CollaboratorTasksDAO.createAllByCollaboratorIdsAndTaskId(
            newIds,
            taskId,
            trx
          );
          await NotificationsService.sendTaskAssignmentNotification(
            trx,
            taskId,
            sessionUserId,
            newIds
          );
        }

        return CollaboratorTasksDAO.findAllByTaskId(trx, taskId);
      }
    );
    this.status = 200;
    this.body = collaboratorTasks;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

interface GetListQuery {
  collectionId?: string;
  stageId?: string;
  designId?: string;
  userId?: string;
  assignFilterUserId?: string;
  limit?: number;
  offset?: number;
  stageFilter?: string;
  statusFilter?: string;
  collectionFilterId?: string;
  designFilterId?: string;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const query: GetListQuery = this.query;
  const {
    collectionId,
    stageId,
    designId,
    designFilterId,
    userId,
    assignFilterUserId,
    stageFilter,
    limit,
    offset,
    statusFilter,
    collectionFilterId,
  } = query;
  if (!collectionId && !stageId && !userId && !designId) {
    this.throw("Missing collectionId, stageId, or userId");
  }
  let tasks: DetailsTask[] = [];
  if (collectionId) {
    tasks = yield TaskEventsDAO.findByCollectionId(collectionId, limit, offset);
  } else if (stageId) {
    tasks = yield TaskEventsDAO.findByStageId(stageId, limit, offset);
  } else if (designId) {
    tasks = yield TaskEventsDAO.findByDesignId(designId, limit, offset);
  } else if (userId) {
    const filters: TaskEventsDAO.TaskFilter[] = [];
    if (stageFilter) {
      filters.push({ type: "STAGE", value: stageFilter });
    }
    if (collectionFilterId) {
      filters.push({ type: "COLLECTION", value: collectionFilterId });
    }
    if (designFilterId) {
      filters.push({ type: "DESIGN", value: designFilterId });
    }
    if (statusFilter) {
      if (statusFilter === "COMPLETED" || statusFilter === "INCOMPLETE") {
        filters.push({ type: "STATUS", value: statusFilter });
      } else {
        throw new Error(`Invalid status filter "${statusFilter}".`);
      }
    }
    tasks = yield TaskEventsDAO.findByUserId(userId, {
      assignFilterUserId,
      limit,
      offset,
      filters,
    });
  }

  this.status = 200;
  this.body = tasks;
}

function* createTaskComment(
  this: TrxContext<AuthedContext<BaseComment & { attachments: Asset[] }>>
): Iterator<any, any, any> {
  const { trx, userId } = this.state;
  const { taskId } = this.params;

  const body = omit(this.request.body, "mentions");
  const filteredBody = pick(body, BASE_COMMENT_PROPERTIES);
  const attachments = this.request.body.attachments || [];

  if (!filteredBody || !isBaseComment(filteredBody) || !taskId) {
    this.throw(
      400,
      `Request does not match task comment model: ${Object.keys(body || {})}`
    );
  }

  const comment = yield createCommentWithAttachments(trx, {
    comment: filteredBody,
    attachments,
    userId,
  });

  const taskComment = yield TaskCommentDAO.create(
    {
      commentId: comment.id,
      taskId,
    },
    trx
  );

  const {
    idNameMap,
    mentionedUserIds,
  } = yield getCollaboratorsFromCommentMentions(trx, filteredBody.text);

  for (const mentionedUserId of mentionedUserIds) {
    yield NotificationsService.sendTaskCommentMentionNotification(trx, {
      taskId,
      commentId: comment.id,
      actorId: userId,
      recipientId: mentionedUserId,
    });
  }

  const commentWithMentions = { ...comment, mentions: idNameMap };

  const threadUserIds: string[] =
    comment.parentCommentId && mentionedUserIds.length === 0
      ? yield getThreadUserIdsFromCommentThread(trx, comment.parentCommentId)
      : [];

  for (const threadUserId of threadUserIds) {
    yield NotificationsService.sendTaskCommentReplyNotification(trx, {
      taskId,
      commentId: comment.id,
      actorId: userId,
      recipientId: threadUserId,
    });
  }

  yield announceTaskCommentCreation(trx, taskComment, commentWithMentions);
  yield NotificationsService.sendTaskCommentCreateNotification(trx, {
    taskId,
    commentId: commentWithMentions.id,
    actorId: userId,
    mentionedUserIds,
    threadUserIds,
  });

  this.status = 201;
  this.body = commentWithMentions;
}

function* getTaskComments(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { trx } = this.state;
  const comments = yield TaskCommentDAO.findByTaskId(this.params.taskId);
  if (comments) {
    const commentsWithMentions = yield addAtMentionDetails(trx, comments);
    const commentsWithAttachments = commentsWithMentions.map(
      addAttachmentLinks
    );
    this.status = 200;
    this.body = commentsWithAttachments;
  } else {
    this.throw(404);
  }
}

router.post("/", requireAuth, typeGuard<IOTask>(isIOTask), createTaskWithEvent);
router.put(
  "/:taskId",
  requireAuth,
  typeGuard<IOTask>(isIOTask),
  createTaskEvent
);
router.put("/:taskId/assignees", requireAuth, updateTaskAssignment);
router.post("/stage/:stageId", requireAuth, createTaskWithEventOnStage);

router.get("/", requireAuth, getList);
router.get("/:taskId", requireAuth, getTaskEvent);

router.put(
  "/:taskId/comments/:commentId",
  requireAuth,
  useTransaction,
  createTaskComment
);
router.get("/:taskId/comments", requireAuth, useTransaction, getTaskComments);

export = router.routes();
