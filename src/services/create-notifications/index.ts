import * as uuid from 'node-uuid';

import * as NotificationsDAO from '../../dao/notifications';
import * as SectionsDAO from '../../dao/product-design-sections';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as StageTasksDAO from '../../dao/product-design-stage-tasks';
import * as StagesDAO from '../../dao/product-design-stages';
import * as DesignsDAO from '../../dao/product-designs';
import * as CollectionsDAO from '../../dao/collections';
import * as TaskEventsDAO from '../../dao/task-events';
import * as UsersDAO from '../../dao/users';

import Notification, { NotificationType } from '../../domain-objects/notification';
import Collaborator, { CollaboratorWithUser } from '../../domain-objects/collaborator';
import User from '../../domain-objects/user';

import findDesignUsers = require('../../services/find-design-users');
import * as EmailService from '../../services/email';

import { CALA_OPS_USER_ID } from '../../config';

/**
 * Deletes pre-existing similar notifications and adds in a new one.
 */
async function replaceNotifications(notification: Uninserted<Notification>): Promise<Notification> {
  await NotificationsDAO.deleteRecent(notification);
  return await NotificationsDAO.create(notification);
}

/**
 * Creates notifications for each recipient for the section create action.
 */
export async function sendSectionCreateNotifications(
  sectionId: string,
  designId: string,
  userId: string
): Promise<Notification[]> {
  const recipients = await findDesignUsers(designId) as User[];

  return Promise.all(recipients.map((recipient: User): Promise<Notification> => {
    return replaceNotifications({
      actionDescription: 'created a new section',
      actorUserId: userId,
      collaboratorId: null,
      collectionId: null,
      commentId: null,
      designId,
      id: uuid.v4(),
      recipientUserId: recipient.id,
      sectionId,
      sentEmailAt: null,
      stageId: null,
      taskId: null,
      type: NotificationType.SECTION_CREATE
    });
  }));
}

/**
 * Creates notifications for each recipient for the section delete action.
 */
export async function sendSectionDeleteNotifications(
  sectionTitle: string,
  designId: string,
  userId: string
): Promise<Notification[]> {
  const recipients = await findDesignUsers(designId) as User[];

  return Promise.all(recipients.map((recipient: User): Promise<Notification> => {
    return replaceNotifications({
      actionDescription: `deleted the "${sectionTitle}" section`,
      actorUserId: userId,
      collaboratorId: null,
      collectionId: null,
      commentId: null,
      designId,
      id: uuid.v4(),
      recipientUserId: recipient.id,
      sectionId: null,
      sentEmailAt: null,
      stageId: null,
      taskId: null,
      type: NotificationType.SECTION_DELETE
    });
  }));
}

/**
 * Creates notifications for each recipient for the section update action.
 */
export async function sendSectionUpdateNotifications(
  sectionId: string,
  designId: string,
  userId: string
): Promise<Notification[]> {
  const section = await SectionsDAO.findById(sectionId);
  if (!section) { throw new Error(`Could not find section ${section}`); }

  const recipients = await findDesignUsers(designId) as User[];
  return Promise.all(recipients.map((recipient: User): Promise<Notification> => {
    return replaceNotifications({
      actionDescription: `updated the "${section.title || 'Untitled'}" section`,
      actorUserId: userId,
      collaboratorId: null,
      collectionId: null,
      commentId: null,
      designId,
      id: uuid.v4(),
      recipientUserId: recipient.id,
      sectionId,
      sentEmailAt: null,
      stageId: null,
      taskId: null,
      type: NotificationType.SECTION_UPDATE
    });
  }));
}

/**
 * Creates notifications for each recipient for the design update action.
 */
export async function sendDesignUpdateNotifications(
  designId: string,
  userId: string
): Promise<Notification[]> {
  const recipients = await findDesignUsers(designId) as User[];

  return Promise.all(recipients.map((recipient: User): Promise<Notification> => {
    return replaceNotifications({
      actionDescription: 'updated the design information',
      actorUserId: userId,
      collaboratorId: null,
      collectionId: null,
      commentId: null,
      designId,
      id: uuid.v4(),
      recipientUserId: recipient.id,
      sectionId: null,
      sentEmailAt: null,
      stageId: null,
      taskId: null,
      type: NotificationType.DESIGN_UPDATE
    });
  }));
}

/**
 * Creates notifications for each recipient for the task comment create action.
 */
export async function sendTaskCommentCreateNotification(
  taskId: string,
  commentId: string,
  actorId: string
): Promise<Notification[]> {
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
    return recipientId !== actorId;
  });

  const stageTask = await StageTasksDAO.findByTaskId(taskId);
  if (!stageTask) { throw new Error(`Could not find a stage task with task id: ${taskId}`); }

  const stage = await StagesDAO.findById(stageTask.designStageId);
  if (!stage) { throw new Error(`Could not find a stage with id: ${stageTask.designStageId}`); }

  const design = await DesignsDAO.findById(stage.designId);
  if (!design) { throw new Error(`Could not find a design with id: ${stage.designId}`); }

  return Promise.all(filteredRecipientIds.map((recipientId: string): Promise<Notification> => {
    return replaceNotifications({
      actionDescription: null,
      actorUserId: actorId,
      collaboratorId: null,
      collectionId: design.collectionIds[0] || null,
      commentId,
      designId: design.id,
      id: uuid.v4(),
      recipientUserId: recipientId,
      sectionId: null,
      sentEmailAt: null,
      stageId: stage.id,
      taskId,
      type: NotificationType.TASK_COMMENT_CREATE
    });
  }));
}

export async function sendTaskAssignmentNotification(
  taskId: string,
  actorId: string,
  collaboratorIds: string[]
): Promise<Notification[]> {
  const collaborators = await CollaboratorsDAO.findAllByIds(collaboratorIds);

  const stageTask = await StageTasksDAO.findByTaskId(taskId);
  if (!stageTask) { throw new Error(`Could not find a stage task with task id: ${taskId}`); }

  const stage = await StagesDAO.findById(stageTask.designStageId);
  if (!stage) { throw new Error(`Could not find a stage with id: ${stageTask.designStageId}`); }

  const design = await DesignsDAO.findById(stage.designId);
  if (!design) { throw new Error(`Could not find a design with id: ${stage.designId}`); }

  return Promise.all(
    collaborators.map((collaborator: CollaboratorWithUser): Promise<Notification> => {
      return replaceNotifications({
        actionDescription: null,
        actorUserId: actorId,
        collaboratorId: collaborator.id,
        collectionId: design.collectionIds[0] || null,
        commentId: null,
        designId: design.id,
        id: uuid.v4(),
        recipientUserId: collaborator.user ? collaborator.user.id : null,
        sectionId: null,
        sentEmailAt: null,
        stageId: stage.id,
        taskId,
        type: NotificationType.TASK_ASSIGNMENT
      });
    })
  );
}

export async function sendTaskCompletionNotification(
  taskId: string,
  actorId: string
): Promise<Notification[]> {
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
      return collaborator.userId !== actorId;
    });

  return Promise.all(
    recipients.map((collaborator: CollaboratorWithUser): Promise<Notification> => {
      return replaceNotifications({
        actionDescription: null,
        actorUserId: actorId,
        collaboratorId: collaborator.id,
        collectionId: design.collectionIds[0] || null,
        commentId: null,
        designId: design.id,
        id: uuid.v4(),
        recipientUserId: collaborator.user ? collaborator.user.id : null,
        sectionId: null,
        sentEmailAt: null,
        stageId: stage.id,
        taskId,
        type: NotificationType.TASK_COMPLETION
      });
    })
  );
}

/**
 * Creates notifications to CALA Ops for a partner accepting a bid.
 */
export async function sendPartnerAcceptServiceBidNotification(
  designId: string,
  actorId: string
): Promise<Notification> {
  if (!CALA_OPS_USER_ID) { throw new Error('CALA Ops account not set!'); }

  return replaceNotifications({
    actionDescription: null,
    actorUserId: actorId,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId,
    id: uuid.v4(),
    recipientUserId: CALA_OPS_USER_ID,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
  });
}

/**
 * Creates notifications to CALA Ops for a partner rejecting a bid.
 */
export async function sendPartnerRejectServiceBidNotification(
  designId: string,
  actorId: string
): Promise<Notification> {
  if (!CALA_OPS_USER_ID) { throw new Error('CALA Ops account not set!'); }

  return replaceNotifications({
    actionDescription: null,
    actorUserId: actorId,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId,
    id: uuid.v4(),
    recipientUserId: CALA_OPS_USER_ID,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.PARTNER_REJECT_SERVICE_BID
  });
}

/**
 * Creates notifications to CALA Ops for a designer submitting a collection.
 */
export async function sendDesignerSubmitCollection(
  collectionId: string,
  actorId: string
): Promise<Notification> {
  if (!CALA_OPS_USER_ID) { throw new Error('CALA Ops account not set!'); }

  return replaceNotifications({
    actionDescription: null,
    actorUserId: actorId,
    collaboratorId: null,
    collectionId,
    commentId: null,
    designId: null,
    id: uuid.v4(),
    recipientUserId: CALA_OPS_USER_ID,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.COLLECTION_SUBMIT
  });
}

/**
 * Creates notifications to a partner for CALA Ops submitting a bid to them.
 */
export async function sendPartnerDesignBid(
  designId: string,
  actorId: string,
  targetId: string
): Promise<Notification> {
  return replaceNotifications({
    actionDescription: null,
    actorUserId: actorId,
    collaboratorId: null,
    collectionId: null,
    commentId: null,
    designId,
    id: uuid.v4(),
    recipientUserId: targetId,
    sectionId: null,
    sentEmailAt: null,
    stageId: null,
    taskId: null,
    type: NotificationType.PARTNER_DESIGN_BID
  });
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
): Promise<Notification> {
  const notification = await NotificationsDAO.create({
    actionDescription: null,
    actorUserId: invitation.actorId,
    collaboratorId: invitation.targetCollaboratorId,
    collectionId: invitation.collectionId,
    commentId: null,
    designId: invitation.designId,
    id: uuid.v4(),
    recipientUserId: invitation.targetUserId,
    sectionId: null,
    sentEmailAt: new Date(),
    stageId: null,
    taskId: null,
    type: NotificationType.INVITE_COLLABORATOR
  });

  const collection = invitation.collectionId
    ? await CollectionsDAO.findById(invitation.collectionId)
    : null;
  const design = invitation.designId
    ? await DesignsDAO.findById(invitation.designId)
    : null;
  const actor = await UsersDAO.findById(invitation.actorId) as (User | null);
  const target = invitation.targetUserId
    ? await UsersDAO.findById(invitation.targetUserId) as (User | null)
    : null;
  const collaborator = await CollaboratorsDAO.findById(
    invitation.targetCollaboratorId
  ) as (Collaborator | null);

  const emailAddress = target
    ? target.email
    : collaborator
      ? collaborator.userEmail
      : new Error('No one is specified to send an email to!');

  await EmailService.enqueueSend({
    params: {
      collection,
      design,
      notification: { ...notification, actor }
    },
    templateName: 'single_notification',
    to: emailAddress
  });

  return notification;
}
