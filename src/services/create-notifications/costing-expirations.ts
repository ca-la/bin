import * as uuid from 'node-uuid';

import { create } from '../../components/notifications/dao';
import { findById as findUser } from '../../components/users/dao';
import {
  ExpiredNotification,
  isExpiredNotification,
  isOneWeekExpirationNotification,
  isTwoDayExpirationNotification,
  OneWeekExpirationNotification,
  TwoDayExpirationNotification
} from '../../components/notifications/models/costing-expiration';
import { templateNotification } from '../../components/notifications/models/base';
import {
  Notification,
  NotificationType
} from '../../components/notifications/domain-object';
import { createNotificationMessage } from '../../components/notifications/notification-messages';
import { CALA_OPS_USER_ID } from '../../config';
import * as EmailService from '../../services/email';
import { validateTypeWithGuardOrThrow } from '../validate';
import User from '../../components/users/domain-object';

async function sendNotification(
  notification: Notification,
  recipient: User
): Promise<void> {
  const notificationMessage = await createNotificationMessage(notification);

  if (!notificationMessage) {
    throw new Error('Could not create notification message');
  }

  await EmailService.enqueueSend({
    params: {
      notification: notificationMessage
    },
    templateName: 'single_notification',
    to: recipient.email
  });
}

/**
 * Immediately sends a notification about the costing expiring in one week for the given collection.
 */
export async function immediatelySendOneWeekCostingExpirationNotification(options: {
  collectionId: string;
  recipientUserId: string;
}): Promise<OneWeekExpirationNotification> {
  const { collectionId, recipientUserId } = options;
  const recipientUser = await findUser(recipientUserId);

  if (!recipientUser) {
    throw new Error(`Could not find user with id ${recipientUserId}`);
  }

  const notification = await create({
    ...templateNotification,
    actorUserId: CALA_OPS_USER_ID,
    collectionId,
    id: uuid.v4(),
    recipientUserId,
    sentEmailAt: new Date(),
    type: NotificationType.COSTING_EXPIRATION_ONE_WEEK
  });

  await sendNotification(notification, recipientUser);

  return validateTypeWithGuardOrThrow(
    notification,
    isOneWeekExpirationNotification,
    `Could not validate ${
      NotificationType.COSTING_EXPIRATION_ONE_WEEK
    } notification type from database with id: ${notification.id}`
  );
}

/**
 * Immediately sends a notification about the costing expiring in two days for the given collection.
 */
export async function immediatelySendTwoDayCostingExpirationNotification(options: {
  collectionId: string;
  recipientUserId: string;
}): Promise<TwoDayExpirationNotification> {
  const { collectionId, recipientUserId } = options;
  const recipientUser = await findUser(recipientUserId);

  if (!recipientUser) {
    throw new Error(`Could not find user with id ${recipientUserId}`);
  }

  const notification = await create({
    ...templateNotification,
    actorUserId: CALA_OPS_USER_ID,
    collectionId,
    id: uuid.v4(),
    recipientUserId,
    sentEmailAt: new Date(),
    type: NotificationType.COSTING_EXPIRATION_TWO_DAYS
  });

  await sendNotification(notification, recipientUser);

  return validateTypeWithGuardOrThrow(
    notification,
    isTwoDayExpirationNotification,
    `Could not validate ${
      NotificationType.COSTING_EXPIRATION_TWO_DAYS
    } notification type from database with id: ${notification.id}`
  );
}

/**
 * Immediately sends a notification about the costing expiring for the given collection.
 */
export async function immediatelySendCostingExpiredNotification(options: {
  collectionId: string;
  recipientUserId: string;
}): Promise<ExpiredNotification> {
  const { collectionId, recipientUserId } = options;
  const recipientUser = await findUser(recipientUserId);

  if (!recipientUser) {
    throw new Error(`Could not find user with id ${recipientUserId}`);
  }

  const notification = await create({
    ...templateNotification,
    actorUserId: CALA_OPS_USER_ID,
    collectionId,
    id: uuid.v4(),
    recipientUserId,
    sentEmailAt: new Date(),
    type: NotificationType.COSTING_EXPIRED
  });

  await sendNotification(notification, recipientUser);

  return validateTypeWithGuardOrThrow(
    notification,
    isExpiredNotification,
    `Could not validate ${
      NotificationType.COSTING_EXPIRED
    } notification type from database with id: ${notification.id}`
  );
}
