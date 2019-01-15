import * as uuid from 'node-uuid';
import { create } from '../../components/notifications/dao';
import Notification from '../../components/notifications/domain-object';
import { findById as findUserById } from '../../dao/users';
import createUser = require('../create-user');

interface NotificationWithResources {
  actor: any;
  notification: Notification;
}

export default async function generateNotification(
  options: Partial<Notification>
): Promise<NotificationWithResources> {
  const { user: actor } = options.actorUserId
    ? { user: await findUserById(options.actorUserId) }
    : await createUser({ withSession: false });

  const notification = await create({
    actionDescription: options.actionDescription || null,
    actorUserId: actor.id,
    annotationId: options.annotationId || null,
    canvasId: options.canvasId || null,
    collaboratorId: options.collaboratorId || null,
    collectionId: options.collectionId || null,
    commentId: options.commentId || null,
    designId: options.designId || null,
    id: options.id || uuid.v4(),
    measurementId: options.measurementId || null,
    recipientUserId: options.recipientUserId || null,
    sectionId: options.sectionId || null,
    sentEmailAt: options.sentEmailAt || null,
    stageId: options.stageId || null,
    taskId: options.taskId || null,
    type: options.type || null
  });

  return {
    actor,
    notification
  };
}
