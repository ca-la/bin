import { groupBy } from 'lodash';
import * as Knex from 'knex';

import * as db from '../../services/db';
import * as Logger from '../../services/logger';
import * as EmailService from '../../services/email';
import * as NotificationsDAO from '../../dao/notifications';
import * as UsersDAO from '../../dao/users';
import Notification from '../../domain-objects/notification';
import User from '../../domain-objects/user';

interface NotificationWithActor extends Notification {
  actor: User;
}

interface NotificationsByRecipient {
  [recipientId: string]: NotificationWithActor[];
}

/**
 * Organizes all unsent notifications by recipient and dispatches it out to SQS.
 */
export async function sendNotificationEmails(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction): Promise<void> => {
    const notifications = await NotificationsDAO.findOutstandingTrx(trx);
    Logger.log(`Processing ${notifications.length} outstanding notifications`);

    const notificationsWithActors = await Promise.all(notifications.map(attachActor));
    const notificationsByRecipient: NotificationsByRecipient = groupBy(
      notificationsWithActors, 'recipientUserId'
    );
    const recipients = Object.keys(notificationsByRecipient);

    await Promise.all(recipients.map(async (recipientId: string): Promise<void> => {
      const recipientNotifications = notificationsByRecipient[recipientId];
      const recipient = await UsersDAO.findById(recipientId);

      if (!recipient) { throw new Error(`Could not find user ${recipientId}`); }

      Logger.log(`
Enqueuing an email with ${recipientNotifications.length} notifications for
User ${recipient.id}.
      `);
      await EmailService.enqueueSend({
        params: { notifications: recipientNotifications },
        templateName: 'batch_notification',
        to: recipient.email
      });
    }));

    await NotificationsDAO.markSentTrx(notifications.map(
      (notification: Notification): string => notification.id
    ), trx);
  });
}

async function attachActor(notification: Notification): Promise<NotificationWithActor> {
  const actor = await UsersDAO.findById(notification.actorUserId);
  return { ...notification, actor };
}
