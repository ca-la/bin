import * as uuid from 'node-uuid';

import * as NotificationsDAO from '../../components/notifications/dao';
import * as CanvasesDAO from '../../dao/product-design-canvases';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as StageTasksDAO from '../../dao/product-design-stage-tasks';
import * as StagesDAO from '../../dao/product-design-stages';
import * as DesignsDAO from '../../dao/product-designs';
import * as CollectionsDAO from '../../dao/collections';
import * as TaskEventsDAO from '../../dao/task-events';
import * as UsersDAO from '../../components/users/dao';

import {
  Notification,
  NotificationType
} from '../../components/notifications/domain-object';
import Collaborator, {
  CollaboratorWithUser
} from '../../components/collaborators/domain-objects/collaborator';

import * as EmailService from '../../services/email';
import * as SlackService from '../../services/slack';

import {
  isTaskAssigmentNotification,
  TaskAssigmentNotification
} from '../../components/notifications/models/task-assignment';
import * as Config from '../../config';
import { createNotificationMessage } from '../../components/notifications/notification-messages';
import {
  AnnotationCommentCreateNotification,
  isAnnotationCommentCreateNotification
} from '../../components/notifications/models/annotation-comment-create';
import { validateTypeWithGuardOrThrow } from '../validate';
import {
  isMeasurementCreateNotification,
  MeasurementCreateNotification
} from '../../components/notifications/models/measurement-create';
import {
  isTaskCommentCreateNotification,
  TaskCommentCreateNotification
} from '../../components/notifications/models/task-comment-create';
import { templateNotification } from '../../components/notifications/models/base';
import {
  isTaskCompletionNotification,
  TaskCompletionNotification
} from '../../components/notifications/models/task-completion';
import {
  isPartnerAcceptServiceBidNotification,
  PartnerAcceptServiceBidNotification
} from '../../components/notifications/models/partner-accept-service-bid';
import {
  CollectionSubmitNotification,
  isCollectionSubmitNotification
} from '../../components/notifications/models/collection-submit';
import {
  isPartnerRejectServiceBidNotification,
  PartnerRejectServiceBidNotification
} from '../../components/notifications/models/partner-reject-service-bid';
import {
  CommitCostInputsNotification,
  isCommitCostInputsNotification
} from '../../components/notifications/models/commit-cost-inputs';
import {
  isPartnerDesignBidNotification,
  PartnerDesignBidNotification
} from '../../components/notifications/models/partner-design-bid';
import {
  InviteCollaboratorNotification,
  isInviteCollaboratorNotification
} from '../../components/notifications/models/invite-collaborator';
import {
  isTaskCommentMentionNotification,
  TaskCommentMentionNotification
} from '../../components/notifications/models/task-comment-mention';
import {
  AnnotationCommentMentionNotification,
  isAnnotationCommentMentionNotification
} from '../../components/notifications/models/annotation-mention';

async function isAdmins(userIds: string[]): Promise<boolean> {
  for (const userId of userIds) {
    const user = await UsersDAO.findById(userId);
    if (!user || user.role !== 'ADMIN') {
      return false;
    }
  }
  return true;
}

/**
 * Deletes pre-existing similar notifications and adds in a new one.
 */
async function replaceNotifications(
  notification: Uninserted<Notification>
): Promise<Notification> {
  await NotificationsDAO.deleteRecent(notification);
  return await NotificationsDAO.create(notification);
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
  mentionedUserIds: string[]
): Promise<AnnotationCommentCreateNotification | null> {
  const canvas = await CanvasesDAO.findById(canvasId);
  if (!canvas) { throw new Error(`Canvas ${canvasId} does not exist!`); }
  const design = await DesignsDAO.findById(canvas.designId);
  if (!design) { throw new Error(`Design ${canvas.designId} does not exist!`); }
  const targetId = design.userId;
  const collectionId = design.collectionIds[0] || null;

  if (actorId === targetId) { return null; }
  if (mentionedUserIds.includes(targetId)) { return null; }

  const id = uuid.v4();
  const notification = await replaceNotifications({
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
    type: NotificationType.ANNOTATION_COMMENT_CREATE
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isAnnotationCommentCreateNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.ANNOTATION_COMMENT_CREATE} notification type from database with id: ${id}`);
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
  recipientUserId: string
): Promise<AnnotationCommentMentionNotification | null> {
  const canvas = await CanvasesDAO.findById(canvasId);
  if (!canvas) { throw new Error(`Canvas ${canvasId} does not exist!`); }
  const design = await DesignsDAO.findById(canvas.designId);
  if (!design) { throw new Error(`Design ${canvas.designId} does not exist!`); }
  const collectionId = design.collectionIds[0] || null;

  const isBetweenAdmins = await isAdmins([actorId, recipientUserId]);
  if (actorId === recipientUserId || !isBetweenAdmins) { return null; }

  const id = uuid.v4();
  const notification = await replaceNotifications({
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
    type: NotificationType.ANNOTATION_COMMENT_MENTION
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isAnnotationCommentMentionNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.ANNOTATION_COMMENT_MENTION} notification type from database with id: ${id}`);
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
  if (!canvas) { throw new Error(`Canvas ${canvasId} does not exist!`); }
  const design = await DesignsDAO.findById(canvas.designId);
  if (!design) { throw new Error(`Design ${canvas.designId} does not exist!`); }
  const targetId = design.userId;
  const collectionId = design.collectionIds[0];
  if (!collectionId) {
    throw new Error(`Collection does not exist for design ${canvas.designId}!`);
  }

  if (actorId === targetId) { return null; }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    ...templateNotification,
    actorUserId: actorId,
    canvasId: canvas.id,
    collectionId,
    designId: design.id,
    id,
    measurementId,
    recipientUserId: targetId,
    sentEmailAt: null,
    type: NotificationType.MEASUREMENT_CREATE
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isMeasurementCreateNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.MEASUREMENT_CREATE} notification type from database with id: ${id}`);
}

/**
 * Creates notifications for each recipient for the task comment create action.
 */
export async function sendTaskCommentCreateNotification(
  taskId: string,
  commentId: string,
  actorId: string,
  mentionedUserIds: string[]
): Promise<TaskCommentCreateNotification[]> {
  const collaborators = await CollaboratorsDAO.findByTask(taskId) as Collaborator[];
  const recipients = collaborators.filter((collaborator: Collaborator): boolean => {
    return Boolean(collaborator.userId);
  }) as Collaborator[];

  const taskEvent = await TaskEventsDAO.findById(taskId);
  if (!taskEvent) { throw new Error(`Could not find a task event with task id: ${taskId}`); }

  const collaboratorUserIds: string[] = recipients
    .filter((collaborator: Collaborator) => Boolean(collaborator.userId))
    .map((collaborator: Collaborator): string => collaborator.userId || '');

  const recipientIds: string[] = taskEvent.createdBy
    ? [...collaboratorUserIds, taskEvent.createdBy]
    : collaboratorUserIds ;
  const filteredRecipientIds = recipientIds.filter((recipientId: string): boolean => {
    return recipientId !== actorId
      && !mentionedUserIds.some((mentionedId: string) => mentionedId === recipientId);
  });

  const stageTask = await StageTasksDAO.findByTaskId(taskId);
  if (!stageTask) { throw new Error(`Could not find a stage task with task id: ${taskId}`); }

  const stage = await StagesDAO.findById(stageTask.designStageId);
  if (!stage) { throw new Error(`Could not find a stage with id: ${stageTask.designStageId}`); }

  const design = await DesignsDAO.findById(stage.designId);
  if (!design) { throw new Error(`Could not find a design with id: ${stage.designId}`); }

  const notifications = [];
  for (const recipientId of filteredRecipientIds) {
    const id = uuid.v4();
    const notification = await replaceNotifications({
      ...templateNotification,
      actorUserId: actorId,
      collectionId: design.collectionIds[0] || null,
      commentId,
      designId: design.id,
      id,
      recipientUserId: recipientId,
      sentEmailAt: null,
      stageId: stage.id,
      taskId,
      type: NotificationType.TASK_COMMENT_CREATE
    });
    const validated = validateTypeWithGuardOrThrow(
      notification,
      isTaskCommentCreateNotification,
      // tslint:disable-next-line:max-line-length
      `Could not validate ${NotificationType.TASK_COMMENT_CREATE} notification type from database with id: ${id}`);
    notifications.push(validated);
  }
  return notifications;
}

/**
 * Creates notifications for the user mentioned in a task comment.
 */
export async function sendTaskCommentMentionNotification(
  taskId: string,
  commentId: string,
  actorId: string,
  recipientId: string
): Promise<TaskCommentMentionNotification | null> {
  const isBetweenAdmins = await isAdmins([recipientId, actorId]);
  if (recipientId === actorId || !isBetweenAdmins) {
    return null;
  }

  const taskEvent = await TaskEventsDAO.findById(taskId);
  if (!taskEvent) { throw new Error(`Could not find a task event with task id: ${taskId}`); }

  const stageTask = await StageTasksDAO.findByTaskId(taskId);
  if (!stageTask) { throw new Error(`Could not find a stage task with task id: ${taskId}`); }

  const stage = await StagesDAO.findById(stageTask.designStageId);
  if (!stage) { throw new Error(`Could not find a stage with id: ${stageTask.designStageId}`); }

  const design = await DesignsDAO.findById(stage.designId);
  if (!design) { throw new Error(`Could not find a design with id: ${stage.designId}`); }

  const id = uuid.v4();
  const notification = await replaceNotifications({
    ...templateNotification,
    actorUserId: actorId,
    collectionId: design.collectionIds[0] || null,
    commentId,
    designId: design.id,
    id,
    recipientUserId: recipientId,
    sentEmailAt: null,
    stageId: stage.id,
    taskId,
    type: NotificationType.TASK_COMMENT_MENTION
  });
  const validated = validateTypeWithGuardOrThrow(
    notification,
    isTaskCommentMentionNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.TASK_COMMENT_MENTION} notification type from database with id: ${id}`);
  return validated;
}

export async function sendTaskAssignmentNotification(
  taskId: string,
  actorId: string,
  collaboratorIds: string[]
): Promise<TaskAssigmentNotification[]> {
  const collaborators = await CollaboratorsDAO.findAllByIds(collaboratorIds);

  const stageTask = await StageTasksDAO.findByTaskId(taskId);
  if (!stageTask) { throw new Error(`Could not find a stage task with task id: ${taskId}`); }

  const stage = await StagesDAO.findById(stageTask.designStageId);
  if (!stage) { throw new Error(`Could not find a stage with id: ${stageTask.designStageId}`); }

  const design = await DesignsDAO.findById(stage.designId);
  if (!design) { throw new Error(`Could not find a design with id: ${stage.designId}`); }

  const notifications = [];

  for (const collaborator of collaborators) {
    if (!collaborator.user || collaborator.user.id === actorId) {
      continue;
    }
    const id = uuid.v4();
    const notification = await replaceNotifications({
      ...templateNotification,
      actorUserId: actorId,
      collaboratorId: collaborator.id,
      collectionId: design.collectionIds[0] || null,
      designId: design.id,
      id,
      recipientUserId: collaborator.user.id,
      sentEmailAt: null,
      stageId: stage.id,
      taskId,
      type: NotificationType.TASK_ASSIGNMENT
    });
    const validated = validateTypeWithGuardOrThrow(
      notification,
      isTaskAssigmentNotification,
      // tslint:disable-next-line:max-line-length
      `Could not validate ${NotificationType.TASK_ASSIGNMENT} notification type from database with id: ${id}`);
    notifications.push(validated);
  }

  return notifications;
}

export async function sendTaskCompletionNotification(
  taskId: string,
  actorId: string
): Promise<TaskCompletionNotification[]> {
  const stageTask = await StageTasksDAO.findByTaskId(taskId);
  if (!stageTask) { throw new Error(`Could not find a stage task with task id: ${taskId}`); }

  const stage = await StagesDAO.findById(stageTask.designStageId);
  if (!stage) { throw new Error(`Could not find a stage with id: ${stageTask.designStageId}`); }

  const design = await DesignsDAO.findById(stage.designId);
  if (!design) { throw new Error(`Could not find a design with id: ${stage.designId}`); }

  const collaborators: CollaboratorWithUser[] =
    await CollaboratorsDAO.findByDesign(design.id);

  const recipients: CollaboratorWithUser[] = collaborators
    .filter((collaborator: CollaboratorWithUser) => {
      return Boolean(collaborator.user) && collaborator.userId !== actorId;
    });

  const notifications = [];
  for (const collaborator of recipients) {
    if (!collaborator.user) {
      continue;
    }
    const id = uuid.v4();
    const notification = await replaceNotifications({
      ...templateNotification,
      actorUserId: actorId,
      collaboratorId: collaborator.id,
      collectionId: design.collectionIds[0] || null,
      designId: design.id,
      id,
      recipientUserId: collaborator.user.id,
      sentEmailAt: null,
      stageId: stage.id,
      taskId,
      type: NotificationType.TASK_COMPLETION
    });
    const validated = validateTypeWithGuardOrThrow(
      notification,
      isTaskCompletionNotification,
      // tslint:disable-next-line:max-line-length
      `Could not validate ${NotificationType.TASK_COMPLETION} notification type from database with id: ${id}`);
    notifications.push(validated);
  }
  return notifications;
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
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });

  SlackService.enqueueSend({
    channel: 'partners',
    params: {
      design: await DesignsDAO.findById(designId),
      partner: await UsersDAO.findById(actorId)
    },
    templateName: 'partner_accept_bid'
  });

  const validated = validateTypeWithGuardOrThrow(
    notification,
    isPartnerAcceptServiceBidNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.PARTNER_ACCEPT_SERVICE_BID} notification type from database with id: ${id}`);

  return validated;
}

/**
 * Creates notifications to CALA Ops for a partner rejecting a bid.
 */
export async function sendPartnerRejectServiceBidNotification(
  designId: string,
  actorId: string
): Promise<PartnerRejectServiceBidNotification> {
  const id = uuid.v4();
  const notification = await NotificationsDAO.create({
    ...templateNotification,
    actorUserId: actorId,
    designId,
    id,
    recipientUserId: Config.CALA_OPS_USER_ID,
    sentEmailAt: null,
    type: NotificationType.PARTNER_REJECT_SERVICE_BID
  });

  SlackService.enqueueSend({
    channel: 'partners',
    params: {
      design: await DesignsDAO.findById(designId),
      partner: await UsersDAO.findById(actorId)
    },
    templateName: 'partner_reject_bid'
  });

  const validated = validateTypeWithGuardOrThrow(
    notification,
    isPartnerRejectServiceBidNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.PARTNER_REJECT_SERVICE_BID} notification type from database with id: ${id}`);

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
    channel: 'designers',
    params: {
      collection: await CollectionsDAO.findById(collectionId),
      designer: await UsersDAO.findById(actorId)
    },
    templateName: 'collection_submission'
  });

  const id = uuid.v4();
  const notification = await replaceNotifications({
    ...templateNotification,
    actorUserId: actorId,
    collectionId,
    id,
    recipientUserId: Config.CALA_OPS_USER_ID,
    sentEmailAt: null,
    type: NotificationType.COLLECTION_SUBMIT
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isCollectionSubmitNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.COLLECTION_SUBMIT} notification type from database with id: ${id}`);
}

/**
 * Creates a notification that a collection has been fully costed and immediately sends it to SQS.
 * Recipients are the edit collaborators (who have accounts) of the collection.
 * Assumption: The collection creator is an edit collaborator.
 */
export async function immediatelySendFullyCostedCollection(
  collectionId: string,
  actorId: string
): Promise<CommitCostInputsNotification[]> {
  const actor = await UsersDAO.findById(actorId);
  if (!actor) { throw new Error(`User ${actorId} does not exist!`); }

  const collection = await CollectionsDAO.findById(collectionId);
  if (!collection) { throw new Error(`Collection ${collectionId} does not exist!`); }

  const collaborators = await CollaboratorsDAO.findByCollection(collectionId);
  const recipients = collaborators.filter((collaborator: Collaborator): boolean => {
    return collaborator.role === 'EDIT' && Boolean(collaborator.userId);
  });

  return Promise.all(recipients.map(
    async (recipient: Collaborator): Promise<CommitCostInputsNotification> => {
      if (!recipient.userId) { throw new Error('User id not on collaborator!'); }
      const user = await UsersDAO.findById(recipient.userId);
      if (!user) { throw new Error(`User ${recipient.userId} not found!`); }

      const id = uuid.v4();
      const notification = await NotificationsDAO.create({
        ...templateNotification,
        actorUserId: actor.id,
        collectionId,
        id,
        recipientUserId: user.id,
        sentEmailAt: new Date(),
        type: NotificationType.COMMIT_COST_INPUTS
      });
      const notificationMessage = await createNotificationMessage(notification);
      if (!notificationMessage) {
        throw new Error('Could not create notification message');
      }
      await EmailService.enqueueSend({
        params: {
          collection,
          notification: notificationMessage
        },
        templateName: 'single_notification',
        to: user.email
      });
      const validated = validateTypeWithGuardOrThrow(
        notification,
        isCommitCostInputsNotification,
        // tslint:disable-next-line:max-line-length
        `Could not validate ${NotificationType.COMMIT_COST_INPUTS} notification type from database with id: ${id}`);

      return validated;
    }
  ));
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
    ...templateNotification,
    actorUserId: actorId,
    designId,
    id,
    recipientUserId: targetId,
    sentEmailAt: null,
    type: NotificationType.PARTNER_DESIGN_BID
  });
  return validateTypeWithGuardOrThrow(
    notification,
    isPartnerDesignBidNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.PARTNER_DESIGN_BID} notification type from database with id: ${id}`);
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
    type: NotificationType.INVITE_COLLABORATOR
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
  const collaborator = await CollaboratorsDAO.findById(
    invitation.targetCollaboratorId
  ) as (Collaborator | null);

  const emailAddress = target
    ? target.email
    : collaborator
      ? collaborator.userEmail
      : new Error('No one is specified to send an email to!');

  const notificationMessage = await createNotificationMessage(notification);
  if (!notificationMessage) {
    throw new Error('Could not create notification message');
  }
  await EmailService.enqueueSend({
    params: {
      collection,
      design,
      notification: notificationMessage
    },
    templateName: 'single_notification',
    to: emailAddress
  });

  const validated = validateTypeWithGuardOrThrow(
    notification,
    isInviteCollaboratorNotification,
    // tslint:disable-next-line:max-line-length
    `Could not validate ${NotificationType.INVITE_COLLABORATOR} notification type from database with id: ${id}`);

  return validated;
}
