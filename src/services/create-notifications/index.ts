import * as uuid from 'node-uuid';
import * as NotificationsDAO from '../../dao/notifications';
import * as SectionsDAO from '../../dao/product-design-sections';
import * as CollaboratorsDAO from '../../dao/collaborators';
import * as StageTasksDAO from '../../dao/product-design-stage-tasks';
import * as StagesDAO from '../../dao/product-design-stages';
import * as DesignsDAO from '../../dao/product-designs';
import * as TaskEventsDAO from '../../dao/task-events';
import Notification, { NotificationType } from '../../domain-objects/notification';
import { Collaborator, CollaboratorWithUserId } from '../../domain-objects/collaborator';
import findDesignUsers = require('../../services/find-design-users');
import User from '../../domain-objects/user';
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
  }) as CollaboratorWithUserId[];

  const taskEvent = await TaskEventsDAO.findById(taskId);
  if (!taskEvent) { throw new Error(`Could not find a task event with task id: ${taskId}`); }

  const collaboratorIds: string[] = recipients.map(
    (collaborator: CollaboratorWithUserId): string => {
      return collaborator.userId;
    }
  );
  const recipientIds: string[] = taskEvent.createdBy
    ? [...collaboratorIds, taskEvent.createdBy]
    : collaboratorIds ;

  const stageTask = await StageTasksDAO.findByTaskId(taskId);
  if (!stageTask) { throw new Error(`Could not find a stage task with task id: ${taskId}`); }

  const stage = await StagesDAO.findById(stageTask.designStageId);
  if (!stage) { throw new Error(`Could not find a stage with id: ${stageTask.designStageId}`); }

  const design = await DesignsDAO.findById(stage.designId);
  if (!design) { throw new Error(`Could not find a design with id: ${stage.designId}`); }

  return Promise.all(recipientIds.map((recipientId: string): Promise<Notification> => {
    return replaceNotifications({
      actionDescription: null,
      actorUserId: actorId,
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

export async function sendPartnerAcceptServiceBidNotification(
  designId: string,
  actorId: string
): Promise<Notification> {
  if (!CALA_OPS_USER_ID) { throw new Error('CALA Ops account not set!'); }

  return replaceNotifications({
    actionDescription: null,
    actorUserId: actorId,
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

export async function sendPartnerRejectServiceBidNotification(
  designId: string,
  actorId: string
): Promise<Notification> {
  if (!CALA_OPS_USER_ID) { throw new Error('CALA Ops account not set!'); }

  return replaceNotifications({
    actionDescription: null,
    actorUserId: actorId,
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
