import { chunk, groupBy } from 'lodash';
import { NotificationMessage } from '@cala/ts-lib';

import * as Logger from '../../services/logger';
import * as EmailService from '../../services/email';
import * as NotificationsDAO from '../../components/notifications/dao';
import * as UsersDAO from '../../components/users/dao';
import filterError = require('../../services/filter-error');
import InvalidDataError = require('../../errors/invalid-data');

import { Notification } from '../../components/notifications/domain-object';
import { createNotificationMessage } from '../../components/notifications/notification-messages';

const QUEUE_LIMIT = 30;

interface NotificationsByRecipient {
  [recipientId: string]: Notification[];
}

/**
 * Organizes all unsent notifications by recipient and dispatches it out to SQS.
 */
export async function sendNotificationEmails(): Promise<number> {
  let sentMessages = 0;
  const notifications = await NotificationsDAO.findOutstanding();
  Logger.log(`Processing ${notifications.length} outstanding notifications`);

  const notificationsByRecipient: NotificationsByRecipient = groupBy(
    notifications,
    'recipientUserId'
  );
  const recipients = Object.keys(notificationsByRecipient);

  for (const recipientId of recipients) {
    const recipientNotifications = notificationsByRecipient[recipientId];
    const recipientNotificationMessages = [];
    for (const notification of recipientNotifications) {
      const message = await createNotificationMessage(notification).catch(
        filterError(InvalidDataError, (err: InvalidDataError) => {
          Logger.logWarning(err.message);
          return null;
        })
      );

      if (message) {
        recipientNotificationMessages.push(message);
      }
    }
    const recipient = await UsersDAO.findById(recipientId);

    if (!recipient) {
      throw new Error(`Could not find user ${recipientId}`);
    }

    const listOfNotificationList = chunk(
      recipientNotificationMessages,
      QUEUE_LIMIT
    );
    for (const notificationList of listOfNotificationList) {
      const notificationListIds = notificationList.map(
        (notification: NotificationMessage): string => notification.id
      );
      Logger.log(`
Enqueuing an email with ${notificationList.length} notifications for user ${
        recipient.id
      }.
      `);

      try {
        await EmailService.enqueueSend({
          params: { notifications: notificationList },
          templateName: 'batch_notification',
          to: recipient.email
        });
        sentMessages += notificationList.length;
      } catch (e) {
        const messageCopy = 'Failed to send to SQS the following notifications';
        Logger.logServerError(e);
        throw new Error(`${messageCopy}: ${notificationListIds.join(', ')}`);
      }

      await NotificationsDAO.markSent(notificationListIds);
    }
  }

  return sentMessages;
}
