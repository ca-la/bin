import uuid from "node-uuid";
import * as Knex from "knex";

import db = require("../db");
import * as NotificationsDAO from "../../components/notifications/dao";
import * as CanvasesDAO from "../../components/canvases/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import * as StageTasksDAO from "../../dao/product-design-stage-tasks";
import * as StagesDAO from "../../dao/product-design-stages";
import DesignsDAO from "../../components/product-designs/dao";
import * as ApprovalStepTasksDAO from "../../components/approval-step-tasks/dao";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import * as CollectionsDAO from "../../components/collections/dao";
import * as TaskEventsDAO from "../../dao/task-events";
import * as UsersDAO from "../../components/users/dao";
import ProductDesign from "../../components/product-designs/domain-objects/product-design";
import ApprovalStep from "../../components/approval-steps/domain-object";

import {
  FullNotification,
  Notification,
  NotificationType,
} from "../../components/notifications/domain-object";
import Collaborator, {
  CollaboratorWithUser,
} from "../../components/collaborators/types";

import * as EmailService from "../../services/email";
import * as SlackService from "../../services/slack";

import {
  isTaskAssigmentNotification,
  TaskAssignmentNotification,
} from "../../components/notifications/models/task-assignment";
import Config from "../../config";
import { createNotificationMessage } from "../../components/notifications/notification-messages";
import {
  AnnotationCommentCreateNotification,
  isAnnotationCommentCreateNotification,
} from "../../components/notifications/models/annotation-comment-create";
import { validateTypeWithGuardOrThrow } from "../validate";
import {
  isMeasurementCreateNotification,
  MeasurementCreateNotification,
} from "../../components/notifications/models/measurement-create";
import {
  isTaskCommentCreateNotification,
  TaskCommentCreateNotification,
} from "../../components/notifications/models/task-comment-create";
import { templateNotification } from "../../components/notifications/models/base";
import {
  isTaskCompletionNotification,
  TaskCompletionNotification,
} from "../../components/notifications/models/task-completion";
import {
  isPartnerAcceptServiceBidNotification,
  PartnerAcceptServiceBidNotification,
} from "../../components/notifications/models/partner-accept-service-bid";
import {
  CollectionSubmitNotification,
  isCollectionSubmitNotification,
} from "../../components/notifications/models/collection-submit";
import {
  isPartnerRejectServiceBidNotification,
  PartnerRejectServiceBidNotification,
} from "../../components/notifications/models/partner-reject-service-bid";
import {
  CommitCostInputsNotification,
  isCommitCostInputsNotification,
} from "../../components/notifications/models/commit-cost-inputs";
import {
  isPartnerDesignBidNotification,
  PartnerDesignBidNotification,
} from "../../components/notifications/models/partner-design-bid";
import {
  InviteCollaboratorNotification,
  isInviteCollaboratorNotification,
} from "../../components/notifications/models/invite-collaborator";
import {
  isTaskCommentMentionNotification,
  TaskCommentMentionNotification,
} from "../../components/notifications/models/task-comment-mention";
import {
  AnnotationCommentMentionNotification,
  isAnnotationCommentMentionNotification,
} from "../../components/notifications/models/annotation-mention";
import {
  AnnotationCommentReplyNotification,
  isAnnotationCommentReplyNotification,
} from "../../components/notifications/models/annotation-reply";
import {
  isTaskCommentReplyNotification,
  TaskCommentReplyNotification,
} from "../../components/notifications/models/task-comment-reply";
import {
  ApprovalStepCommentMentionNotification,
  isApprovalStepCommentMentionNotification,
} from "../../components/notifications/models/approval-step-comment-mention";
import {
  ApprovalStepCommentReplyNotification,
  isApprovalStepCommentReplyNotification,
} from "../../components/notifications/models/approval-step-comment-reply";
import {
  ApprovalStepCommentCreateNotification,
  isApprovalStepCommentCreateNotification,
} from "../../components/notifications/models/approval-step-comment-create";

import ProductDesignStage from "../../domain-objects/product-design-stage";
import { BidRejection } from "../../components/bid-rejections/domain-object";
import { getRecipientsByCollection } from "../../components/notifications/service";
import { Recipient } from "../cala-component/cala-notifications";
import { TeamUsersDAO } from "../../components/team-users";

/**
 * Deletes pre-existing similar notifications and adds in a new one by comparing columns.
 * To only compare certain columns use an optional mergeList
 */
export async function replaceNotifications(options: {
  trx?: Knex.Transaction;
  notification: Uninserted<Notification>;
}): Promise<FullNotification> {
  const { notification, trx } = options;

  await NotificationsDAO.deleteRecent(notification, trx);
  return NotificationsDAO.create(notification, trx);
}

/**
 * Creates a notification for the owner of the design that comment has been created
 * on an annotation. Note: this will only create a notification if the actor is not
 * the owner.
 */
export async function sendDesignOwnerAnnotationCommentCreateNotification(
  annotationId: string,
  canvasId: string,
  commentId: string,
  actorId: string,
  mentionedUserIds: string[],
  threadUserIds: string[],
  trx?: Knex.Transaction
): Promise<AnnotationCommentCreateNotification | null> {
  const canvas = await CanvasesDAO.findById(canvasId, trx);
  if (!canvas) {
    throw new Error(`Canvas ${canvasId} does not exist!`);
  }
  const design = await DesignsDAO.findById(
    canvas.designId,
    undefined,
    undefined,
    trx
  );
  if (!design) {
    throw new Error(`Design ${canvas.designId} does not exist!`);
  }
  const targetId = design.userId;
  const collectionId = design.collectionIds[0] || null;

  if (actorId === targetId) {
    return null;
  }
  if (mentionedUserIds.includes(targetId) || threadUserIds.includes(targetId)) {
    return null;
  }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      annotationId,
      canvasId: canvas.id,
      collectionId,
      commentId,
      designId: design.id,
      id,
      recipientUserId: targetId,
      sentEmailAt: null,
      type: NotificationType.ANNOTATION_COMMENT_CREATE,
    },
    trx,
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isAnnotationCommentCreateNotification,
    `Could not validate ${NotificationType.ANNOTATION_COMMENT_CREATE} notification type from database with id: ${id}`
  );
}

/**
 * Creates a notification for the user that was mentioned in the comment.
 * Note: this will only create a notification if the actor is not the owner.
 */
export async function sendAnnotationCommentMentionNotification(
  annotationId: string,
  canvasId: string,
  commentId: string,
  actorId: string,
  recipientUserId: string,
  trx?: Knex.Transaction
): Promise<AnnotationCommentMentionNotification | null> {
  const canvas = await CanvasesDAO.findById(canvasId, trx);
  if (!canvas) {
    throw new Error(`Canvas ${canvasId} does not exist!`);
  }
  const design = await DesignsDAO.findById(
    canvas.designId,
    undefined,
    undefined,
    trx
  );
  if (!design) {
    throw new Error(`Design ${canvas.designId} does not exist!`);
  }
  const collectionId = design.collectionIds[0] || null;

  if (actorId === recipientUserId) {
    return null;
  }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      annotationId,
      canvasId: canvas.id,
      collectionId,
      commentId,
      designId: design.id,
      id,
      recipientUserId,
      sentEmailAt: null,
      type: NotificationType.ANNOTATION_COMMENT_MENTION,
    },
    trx,
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isAnnotationCommentMentionNotification,
    `Could not validate ${NotificationType.ANNOTATION_COMMENT_MENTION} notification type from database with id: ${id}`
  );
}

export async function sendAnnotationCommentReplyNotification(
  trx: Knex.Transaction,
  annotationId: string,
  canvasId: string,
  designId: string,
  commentId: string,
  actorId: string,
  recipientUserId: string
): Promise<AnnotationCommentReplyNotification | null> {
  const design = await DesignsDAO.findById(designId, undefined, undefined, trx);
  if (!design) {
    throw new Error(`Design ${designId} does not exist!`);
  }
  const collectionId = design.collectionIds[0] || null;

  if (actorId === recipientUserId) {
    return null;
  }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    trx,
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      annotationId,
      canvasId,
      collectionId,
      commentId,
      designId: design.id,
      id,
      recipientUserId,
      sentEmailAt: null,
      type: NotificationType.ANNOTATION_COMMENT_REPLY,
    },
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isAnnotationCommentReplyNotification,
    `Could not validate ${NotificationType.ANNOTATION_COMMENT_REPLY} notification type from database with id: ${id}`
  );
}

/**
 * Creates a notification for the owner of the design that a measurement has been created.
 * Note: this will only create a notification if the actor is not the owner.
 */
export async function sendDesignOwnerMeasurementCreateNotification(
  measurementId: string,
  canvasId: string,
  actorId: string
): Promise<MeasurementCreateNotification | null> {
  const canvas = await CanvasesDAO.findById(canvasId);
  if (!canvas) {
    throw new Error(`Canvas ${canvasId} does not exist!`);
  }
  const design = await DesignsDAO.findById(canvas.designId);
  if (!design) {
    throw new Error(`Design ${canvas.designId} does not exist!`);
  }
  const targetId = design.userId;
  const collectionId = design.collectionIds[0];
  if (!collectionId) {
    throw new Error(`Collection does not exist for design ${canvas.designId}!`);
  }

  if (actorId === targetId) {
    return null;
  }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      canvasId: canvas.id,
      collectionId,
      designId: design.id,
      id,
      measurementId,
      recipientUserId: targetId,
      sentEmailAt: null,
      type: NotificationType.MEASUREMENT_CREATE,
    },
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isMeasurementCreateNotification,
    `Could not validate ${NotificationType.MEASUREMENT_CREATE} notification type from database with id: ${id}`
  );
}

interface TaskAssets {
  stage: ProductDesignStage | null;
  approvalStep: ApprovalStep | null;
  design: ProductDesign;
}

export const findTaskAssets = async (
  trx: Knex.Transaction,
  taskId: string
): Promise<TaskAssets> => {
  const stageTask = await StageTasksDAO.findByTaskId(taskId, trx);
  if (stageTask) {
    const stage = await StagesDAO.findById(stageTask.designStageId, trx);
    if (!stage) {
      throw new Error(
        `Could not find a stage with id: ${stageTask.designStageId}`
      );
    }

    const design = await DesignsDAO.findById(stage.designId);
    if (!design) {
      throw new Error(`Could not find a design with id: ${stage.designId}`);
    }
    return {
      approvalStep: null,
      stage,
      design,
    };
  } else {
    const approvalStepTask = await ApprovalStepTasksDAO.findByTaskId(
      trx,
      taskId
    );

    if (!approvalStepTask) {
      throw new Error(`The task #${taskId} should have stage or approvalStep`);
    }

    const approvalStep = await ApprovalStepsDAO.findById(
      trx,
      approvalStepTask.approvalStepId
    );
    if (!approvalStep) {
      throw new Error(
        `Could not find an approvalStep with id: ${approvalStepTask.approvalStepId}`
      );
    }

    const design = await DesignsDAO.findById(approvalStep.designId);
    if (!design) {
      throw new Error(
        `Could not find a design with id: ${approvalStep.designId}`
      );
    }

    return {
      approvalStep,
      stage: null,
      design,
    };
  }
};

/**
 * Creates notifications for each recipient for the task comment create action.
 */
export async function sendTaskCommentCreateNotification(
  trx: Knex.Transaction,
  options: {
    taskId: string;
    commentId: string;
    actorId: string;
    mentionedUserIds: string[];
    threadUserIds: string[];
  }
): Promise<TaskCommentCreateNotification[]> {
  const {
    taskId,
    commentId,
    actorId,
    mentionedUserIds,
    threadUserIds,
  } = options;
  const collaborators = (await CollaboratorsDAO.findByTask(
    taskId,
    trx
  )) as Collaborator[];
  const recipients = collaborators.filter(
    (collaborator: Collaborator): boolean => {
      return Boolean(collaborator.userId);
    }
  ) as Collaborator[];

  const taskEvent = await TaskEventsDAO.findById(trx, taskId);
  if (!taskEvent) {
    throw new Error(`Could not find a task event with task id: ${taskId}`);
  }

  const collaboratorUserIds: string[] = recipients
    .filter((collaborator: Collaborator) => Boolean(collaborator.userId))
    .map((collaborator: Collaborator): string => collaborator.userId || "");

  const recipientIds: string[] = taskEvent.createdBy
    ? [...collaboratorUserIds, taskEvent.createdBy]
    : collaboratorUserIds;
  const filteredRecipientIds = recipientIds.filter(
    (recipientId: string): boolean => {
      return (
        recipientId !== actorId &&
        !mentionedUserIds.some(
          (mentionedId: string) => mentionedId === recipientId
        ) &&
        !threadUserIds.some(
          (threadUserId: string) => threadUserId === recipientId
        )
      );
    }
  );

  const assets = await findTaskAssets(trx, taskId);

  const { design, stage, approvalStep } = assets;

  const notifications = [];
  for (const recipientId of filteredRecipientIds) {
    const id = uuid.v4();
    const notification = await replaceNotifications({
      notification: {
        ...templateNotification,
        actorUserId: actorId,
        collectionId: (design.collectionIds && design.collectionIds[0]) || null,
        commentId,
        designId: design.id,
        id,
        recipientUserId: recipientId,
        sentEmailAt: null,
        stageId: stage ? stage.id : null,
        approvalStepId: approvalStep ? approvalStep.id : null,
        taskId,
        type: NotificationType.TASK_COMMENT_CREATE,
      },
      trx,
    });
    const validated = validateTypeWithGuardOrThrow(
      notification,
      isTaskCommentCreateNotification,
      `Could not validate ${NotificationType.TASK_COMMENT_CREATE} notification type from database with id: ${id}`
    );
    notifications.push(validated);
  }
  return notifications;
}

/**
 * Creates notifications for the user mentioned in a task comment.
 */
export async function sendTaskCommentMentionNotification(
  trx: Knex.Transaction,
  options: {
    taskId: string;
    commentId: string;
    actorId: string;
    recipientId: string;
  }
): Promise<TaskCommentMentionNotification | null> {
  const { taskId, commentId, actorId, recipientId } = options;
  if (recipientId === actorId) {
    return null;
  }

  const { design, stage, approvalStep } = await findTaskAssets(trx, taskId);

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      collectionId: (design.collectionIds && design.collectionIds[0]) || null,
      commentId,
      designId: design.id,
      id,
      recipientUserId: recipientId,
      sentEmailAt: null,
      stageId: stage ? stage.id : null,
      approvalStepId: approvalStep ? approvalStep.id : null,
      taskId,
      type: NotificationType.TASK_COMMENT_MENTION,
    },
    trx,
  });
  const validated = validateTypeWithGuardOrThrow(
    notification,
    isTaskCommentMentionNotification,
    `Could not validate ${NotificationType.TASK_COMMENT_MENTION} notification type from database with id: ${id}`
  );
  return validated;
}

/**
 * Creates notifications for the user mentioned in a task comment.
 */
export async function sendTaskCommentReplyNotification(
  trx: Knex.Transaction,
  options: {
    taskId: string;
    commentId: string;
    actorId: string;
    recipientId: string;
  }
): Promise<TaskCommentReplyNotification | null> {
  const { taskId, commentId, actorId, recipientId } = options;
  if (recipientId === actorId) {
    return null;
  }

  const { design, stage, approvalStep } = await findTaskAssets(trx, taskId);

  const collaborators: CollaboratorWithUser[] = await CollaboratorsDAO.findAllForUserThroughDesign(
    design.id,
    recipientId,
    trx
  );
  if (collaborators.length === 0) {
    return null;
  }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      collectionId: (design.collectionIds && design.collectionIds[0]) || null,
      commentId,
      designId: design.id,
      id,
      recipientUserId: recipientId,
      sentEmailAt: null,
      stageId: stage ? stage.id : null,
      approvalStepId: approvalStep ? approvalStep.id : null,
      taskId,
      type: NotificationType.TASK_COMMENT_REPLY,
    },
    trx,
  });
  const validated = validateTypeWithGuardOrThrow(
    notification,
    isTaskCommentReplyNotification,
    `Could not validate ${NotificationType.TASK_COMMENT_REPLY} notification type from database with id: ${id}`
  );
  return validated;
}

export async function sendTaskAssignmentNotification(
  trx: Knex.Transaction,
  taskId: string,
  actorId: string,
  collaboratorIds: string[]
): Promise<TaskAssignmentNotification[]> {
  const collaborators = await CollaboratorsDAO.findAllByIds(
    trx,
    collaboratorIds
  );
  const { design, stage, approvalStep } = await findTaskAssets(trx, taskId);

  const notifications = [];

  for (const collaborator of collaborators) {
    if (!collaborator.user || collaborator.user.id === actorId) {
      continue;
    }
    const id = uuid.v4();
    const notification = await replaceNotifications({
      trx,
      notification: {
        ...templateNotification,
        actorUserId: actorId,
        collaboratorId: collaborator.id,
        collectionId: (design.collectionIds && design.collectionIds[0]) || null,
        designId: design.id,
        id,
        recipientUserId: collaborator.user.id,
        sentEmailAt: null,
        stageId: stage ? stage.id : null,
        approvalStepId: approvalStep ? approvalStep.id : null,
        taskId,
        type: NotificationType.TASK_ASSIGNMENT,
      },
    });
    const validated = validateTypeWithGuardOrThrow(
      notification,
      isTaskAssigmentNotification,
      `Could not validate ${NotificationType.TASK_ASSIGNMENT} notification type from database with id: ${id}`
    );
    notifications.push(validated);
  }

  return notifications;
}

export async function sendTaskCompletionNotification(
  trx: Knex.Transaction,
  taskId: string,
  actorId: string
): Promise<TaskCompletionNotification[]> {
  const { design, stage, approvalStep } = await findTaskAssets(trx, taskId);

  const collaborators: CollaboratorWithUser[] = await CollaboratorsDAO.findByDesign(
    design.id
  );

  const recipients: CollaboratorWithUser[] = collaborators.filter(
    (collaborator: CollaboratorWithUser) => {
      return Boolean(collaborator.user) && collaborator.userId !== actorId;
    }
  );

  const notifications = [];
  for (const collaborator of recipients) {
    if (!collaborator.user) {
      continue;
    }
    const id = uuid.v4();
    const notification = await replaceNotifications({
      notification: {
        ...templateNotification,
        actorUserId: actorId,
        collaboratorId: collaborator.id,
        collectionId: (design.collectionIds && design.collectionIds[0]) || null,
        designId: design.id,
        id,
        recipientUserId: collaborator.user.id,
        sentEmailAt: null,
        stageId: stage ? stage.id : null,
        approvalStepId: approvalStep ? approvalStep.id : null,
        taskId,
        type: NotificationType.TASK_COMPLETION,
      },
    });
    const validated = validateTypeWithGuardOrThrow(
      notification,
      isTaskCompletionNotification,
      `Could not validate ${NotificationType.TASK_COMPLETION} notification type from database with id: ${id}`
    );
    notifications.push(validated);
  }
  return notifications;
}

/**
 * Creates notifications for the user mentioned in an approval comment.
 */
export async function sendApprovalStepCommentMentionNotification(
  trx: Knex.Transaction,
  options: {
    approvalStepId: string;
    commentId: string;
    actorId: string;
    recipientId: string;
  }
): Promise<ApprovalStepCommentMentionNotification | null> {
  const { approvalStepId, commentId, actorId, recipientId } = options;
  if (recipientId === actorId) {
    return null;
  }

  const approvalStep = await ApprovalStepsDAO.findById(trx, approvalStepId);
  if (!approvalStep) {
    throw new Error(
      `Could not find a approval step with id: ${approvalStepId}`
    );
  }

  const design = await DesignsDAO.findById(approvalStep.designId);
  if (!design) {
    throw new Error(
      `Could not find a design with id: ${approvalStep.designId}`
    );
  }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      collectionId: design.collectionIds[0] || null,
      commentId,
      designId: design.id,
      id,
      recipientUserId: recipientId,
      sentEmailAt: null,
      approvalStepId,
      type: NotificationType.APPROVAL_STEP_COMMENT_MENTION,
    },
    trx,
  });
  const validated = validateTypeWithGuardOrThrow(
    notification,
    isApprovalStepCommentMentionNotification,
    `Could not validate ${NotificationType.APPROVAL_STEP_COMMENT_MENTION} notification type from database with id: ${id}`
  );
  return validated;
}

/**
 * Creates notifications for to users replied to in an approval comment.
 */
export async function sendApprovalStepCommentReplyNotification(
  trx: Knex.Transaction,
  options: {
    approvalStepId: string;
    commentId: string;
    actorId: string;
    recipientId: string;
  }
): Promise<ApprovalStepCommentReplyNotification | null> {
  const { approvalStepId, commentId, actorId, recipientId } = options;
  if (recipientId === actorId) {
    return null;
  }

  const approvalStep = await ApprovalStepsDAO.findById(trx, approvalStepId);
  if (!approvalStep) {
    throw new Error(
      `Could not find a approval step with id: ${approvalStepId}`
    );
  }

  const design = await DesignsDAO.findById(approvalStep.designId);
  if (!design) {
    throw new Error(
      `Could not find a design with id: ${approvalStep.designId}`
    );
  }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      collectionId: design.collectionIds[0] || null,
      commentId,
      designId: design.id,
      id,
      recipientUserId: recipientId,
      sentEmailAt: null,
      approvalStepId,
      type: NotificationType.APPROVAL_STEP_COMMENT_REPLY,
    },
    trx,
  });
  const validated = validateTypeWithGuardOrThrow(
    notification,
    isApprovalStepCommentReplyNotification,
    `Could not validate ${NotificationType.APPROVAL_STEP_COMMENT_REPLY} notification type from database with id: ${id}`
  );
  return validated;
}

/**
 * Creates a notification for the owner of the design that comment has been created
 * on an approval step. Note: this will only create a notification if the actor is not
 * the owner.
 */
export async function sendDesignOwnerApprovalStepCommentCreateNotification(
  trx: Knex.Transaction,
  approvalStepId: string,
  commentId: string,
  actorId: string,
  mentionedUserIds: string[],
  threadUserIds: string[]
): Promise<ApprovalStepCommentCreateNotification | null> {
  const approvalStep = await ApprovalStepsDAO.findById(trx, approvalStepId);
  if (!approvalStep) {
    throw new Error(
      `Could not find a approval step with id: ${approvalStepId}`
    );
  }

  const design = await DesignsDAO.findById(approvalStep.designId);
  if (!design) {
    throw new Error(
      `Could not find a design with id: ${approvalStep.designId}`
    );
  }

  const targetId = design.userId;
  const collectionId = design.collectionIds[0] || null;
  if (actorId === targetId) {
    return null;
  }
  if (mentionedUserIds.includes(targetId) || threadUserIds.includes(targetId)) {
    return null;
  }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      approvalStepId,
      actorUserId: actorId,
      collectionId,
      commentId,
      designId: design.id,
      id,
      recipientUserId: targetId,
      sentEmailAt: null,
      type: NotificationType.APPROVAL_STEP_COMMENT_CREATE,
    },
    trx,
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isApprovalStepCommentCreateNotification,
    `Could not validate ${NotificationType.APPROVAL_STEP_COMMENT_CREATE} notification type from database with id: ${id}`
  );
}

/**
 * Creates notifications to CALA Ops for a partner accepting a bid.
 */
export async function sendPartnerAcceptServiceBidNotification(
  designId: string,
  actorId: string
): Promise<PartnerAcceptServiceBidNotification> {
  const id = uuid.v4();
  const notification = await NotificationsDAO.create({
    ...templateNotification,
    actorUserId: actorId,
    designId,
    id,
    recipientUserId: Config.CALA_OPS_USER_ID,
    sentEmailAt: null,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });

  SlackService.enqueueSend({
    channel: "partners",
    params: {
      design: await DesignsDAO.findById(designId),
      partner: await UsersDAO.findById(actorId),
    },
    templateName: "partner_accept_bid",
  });

  const validated = validateTypeWithGuardOrThrow(
    notification,
    isPartnerAcceptServiceBidNotification,
    `Could not validate ${NotificationType.PARTNER_ACCEPT_SERVICE_BID} notification type from database with id: ${id}`
  );

  return validated;
}

/**
 * Creates notifications to CALA Ops for a partner rejecting a bid.
 */
export async function sendPartnerRejectServiceBidNotification(params: {
  actorId: string;
  designId: string;
  bidRejection: BidRejection;
}): Promise<PartnerRejectServiceBidNotification> {
  const { actorId, bidRejection, designId } = params;

  const id = uuid.v4();
  const notification = await NotificationsDAO.create({
    ...templateNotification,
    actorUserId: actorId,
    designId,
    id,
    recipientUserId: Config.CALA_OPS_USER_ID,
    sentEmailAt: null,
    type: NotificationType.PARTNER_REJECT_SERVICE_BID,
  });
  SlackService.enqueueSend({
    channel: "partners",
    params: {
      bidRejection,
      design: await DesignsDAO.findById(designId),
      partner: await UsersDAO.findById(actorId),
    },
    templateName: "partner_reject_bid",
  });

  const validated = validateTypeWithGuardOrThrow(
    notification,
    isPartnerRejectServiceBidNotification,
    `Could not validate ${NotificationType.PARTNER_REJECT_SERVICE_BID} notification type from database with id: ${id}`
  );

  return validated;
}

/**
 * Creates notifications to CALA Ops for a designer submitting a collection.
 * Also sends off a slack notification of the submission event.
 */
export async function sendDesignerSubmitCollection(
  collectionId: string,
  actorId: string
): Promise<CollectionSubmitNotification> {
  SlackService.enqueueSend({
    channel: "designers",
    params: {
      collection: await CollectionsDAO.findById(collectionId),
      designer: await UsersDAO.findById(actorId),
    },
    templateName: "collection_submission",
  });

  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      collectionId,
      id,
      recipientUserId: Config.CALA_OPS_USER_ID,
      sentEmailAt: null,
      type: NotificationType.COLLECTION_SUBMIT,
    },
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isCollectionSubmitNotification,
    `Could not validate ${NotificationType.COLLECTION_SUBMIT} notification type from database with id: ${id}`
  );
}

/**
 * Creates a notification that a collection has been fully costed and immediately sends it to SQS.
 */
export async function immediatelySendFullyCostedCollection(
  collectionId: string,
  actorId: string
): Promise<CommitCostInputsNotification[]> {
  const actor = await UsersDAO.findById(actorId);
  if (!actor) {
    throw new Error(`User ${actorId} does not exist!`);
  }

  const collection = await CollectionsDAO.findById(collectionId);
  if (!collection) {
    throw new Error(`Collection ${collectionId} does not exist!`);
  }

  const recipients = await getRecipientsByCollection(db, collectionId);

  return Promise.all(
    recipients.map(
      async (recipient: Recipient): Promise<CommitCostInputsNotification> => {
        const id = uuid.v4();
        const notification = await NotificationsDAO.create({
          ...templateNotification,
          actorUserId: actor.id,
          collectionId,
          id,
          sentEmailAt: recipient.recipientUserId ? new Date() : null,
          type: NotificationType.COMMIT_COST_INPUTS,
          ...recipient,
        });

        const notificationMessage = await createNotificationMessage(
          notification
        );

        if (!notificationMessage) {
          throw new Error("Could not create notification message");
        }

        if (recipient.recipientUserId) {
          const user = await UsersDAO.findById(recipient.recipientUserId);
          if (!user) {
            throw new Error(
              `Cannot find user with ID ${recipient.recipientUserId}`
            );
          }

          await EmailService.enqueueSend({
            params: {
              collection,
              notification: notificationMessage,
            },
            templateName: "single_notification",
            to: user.email,
          });
        }

        const validated = validateTypeWithGuardOrThrow(
          notification,
          isCommitCostInputsNotification,
          `Could not validate ${NotificationType.COMMIT_COST_INPUTS} notification type from database with id: ${id}`
        );

        return validated;
      }
    )
  );
}

/**
 * Creates notifications to a partner for CALA Ops submitting a bid to them.
 */
export async function sendPartnerDesignBid(
  designId: string,
  actorId: string,
  targetId: string
): Promise<PartnerDesignBidNotification> {
  const id = uuid.v4();
  const notification = await replaceNotifications({
    notification: {
      ...templateNotification,
      actorUserId: actorId,
      designId,
      id,
      recipientUserId: targetId,
      sentEmailAt: null,
      type: NotificationType.PARTNER_DESIGN_BID,
    },
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isPartnerDesignBidNotification,
    `Could not validate ${NotificationType.PARTNER_DESIGN_BID} notification type from database with id: ${id}`
  );
}

interface CollaboratorInviteArguments {
  actorId: string;
  collectionId: string | null;
  designId: string | null;
  targetCollaboratorId: string;
  targetUserId: string | null;
}

/**
 * Creates a collaborator invite notification and immediately sends it to SQS.
 */
export async function immediatelySendInviteCollaborator(
  invitation: CollaboratorInviteArguments
): Promise<InviteCollaboratorNotification> {
  const id = uuid.v4();
  const notification = await NotificationsDAO.create({
    ...templateNotification,
    actorUserId: invitation.actorId,
    collaboratorId: invitation.targetCollaboratorId,
    collectionId: invitation.collectionId,
    designId: invitation.designId,
    id,
    recipientUserId: invitation.targetUserId,
    sentEmailAt: new Date(),
    type: NotificationType.INVITE_COLLABORATOR,
  });

  const collection = invitation.collectionId
    ? await CollectionsDAO.findById(invitation.collectionId)
    : null;
  const design = invitation.designId
    ? await DesignsDAO.findById(invitation.designId)
    : null;
  const target = invitation.targetUserId
    ? await UsersDAO.findById(invitation.targetUserId)
    : null;
  const collaborator = (await CollaboratorsDAO.findById(
    invitation.targetCollaboratorId
  )) as Collaborator | null;

  const emailAddress = target
    ? target.email
    : collaborator
    ? collaborator.userEmail
    : new Error("No one is specified to send an email to!");

  const notificationMessage = await createNotificationMessage(notification);
  if (!notificationMessage) {
    throw new Error("Could not create notification message");
  }
  await EmailService.enqueueSend({
    params: {
      collection,
      design,
      notification: notificationMessage,
    },
    templateName: "single_notification",
    to: emailAddress,
  });

  const validated = validateTypeWithGuardOrThrow(
    notification,
    isInviteCollaboratorNotification,
    `Could not validate ${NotificationType.INVITE_COLLABORATOR} notification type from database with id: ${id}`
  );

  return validated;
}

export async function immediatelySendInviteTeamUser(
  trx: Knex.Transaction,
  notification: FullNotification
): Promise<void> {
  if (!notification.recipientTeamUserId) {
    return;
  }
  const teamUser = await TeamUsersDAO.findById(
    trx,
    notification.recipientTeamUserId
  );
  if (!teamUser) {
    throw new Error(`Could not find teamUser for team invite notification`);
  }

  const user =
    teamUser && teamUser.userId
      ? await UsersDAO.findById(teamUser.userId)
      : null;

  const emailAddress = user
    ? user.email
    : teamUser.userEmail
    ? teamUser.userEmail
    : new Error("No one is specified to send an email to!");
  const notificationMessage = await createNotificationMessage(
    notification,
    trx
  );
  if (!notificationMessage) {
    throw new Error("Could not create notification message");
  }
  await EmailService.enqueueSend({
    params: {
      notification: notificationMessage,
    },
    templateName: "single_notification",
    to: emailAddress,
  });
  await NotificationsDAO.markSent([notification.id], trx);
}
