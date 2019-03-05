import { chunk, groupBy } from 'lodash';

import * as Logger from '../../services/logger';
import * as EmailService from '../../services/email';
import * as NotificationsDAO from '../../components/notifications/dao';
import * as UsersDAO from '../../dao/users';
import { HydratedNotification } from '../../components/notifications/domain-object';

const QUEUE_LIMIT = 30;

interface NotificationsByRecipient {
  [recipientId: string]: HydratedNotification[];
}

/**
 * Organizes all unsent notifications by recipient and dispatches it out to SQS.
 */
export async function sendNotificationEmails(): Promise<void> {
  const hydratedNotifications = await NotificationsDAO.findOutstanding();
  Logger.log(`Processing ${hydratedNotifications.length} outstanding notifications`);

  const notificationsByRecipient: NotificationsByRecipient = groupBy(
    hydratedNotifications, 'recipientUserId'
  );
  const recipients = Object.keys(notificationsByRecipient);

  for (const recipientId of recipients) {
    const recipientNotifications = notificationsByRecipient[recipientId];
    const recipient = await UsersDAO.findById(recipientId);

    if (!recipient) { throw new Error(`Could not find user ${recipientId}`); }

    const listOfNotificationList = chunk(recipientNotifications, QUEUE_LIMIT);
    for (const notificationList of listOfNotificationList) {
      const notificationListIds = notificationList.map(
        (hydratedNotification: HydratedNotification): string => hydratedNotification.id
      );
      Logger.log(`
Enqueuing an email with ${notificationList.length} notifications for user ${recipient.id}.
      `);

      try {
        await EmailService.enqueueSend({
          params: { notifications: notificationList },
          templateName: 'batch_notification',
          to: recipient.email
        });
      } catch (e) {
        const messageCopy = 'Failed to send to SQS the following notifications';
        Logger.logServerError(e);
        throw new Error(`${messageCopy}: ${notificationListIds.join(', ')}`);
      }

      await NotificationsDAO.markSent(notificationListIds);
    }
  }
}
