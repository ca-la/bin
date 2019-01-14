import { groupBy } from 'lodash';
import * as Knex from 'knex';

import * as db from '../../services/db';
import * as Logger from '../../services/logger';
import * as EmailService from '../../services/email';

import * as NotificationsDAO from '../../components/notifications/dao';
import * as UsersDAO from '../../dao/users';

import { HydratedNotification } from '../../components/notifications/domain-object';

interface NotificationsByRecipient {
  [recipientId: string]: HydratedNotification[];
}

/**
 * Organizes all unsent notifications by recipient and dispatches it out to SQS.
 */
export async function sendNotificationEmails(): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction): Promise<void> => {
    const hydratedNotifications = await NotificationsDAO.findOutstandingTrx(trx);
    Logger.log(`Processing ${hydratedNotifications.length} outstanding notifications`);

    const notificationsByRecipient: NotificationsByRecipient = groupBy(
      hydratedNotifications, 'recipientUserId'
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

    await NotificationsDAO.markSentTrx(hydratedNotifications.map(
      (hydratedNotification: HydratedNotification): string => hydratedNotification.id
    ), trx);
  });
}
