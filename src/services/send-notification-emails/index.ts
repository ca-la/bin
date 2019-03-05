import { chunk, groupBy } from 'lodash';
import * as Knex from 'knex';

import * as db from '../../services/db';
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

      const listOfNotificationList = chunk(recipientNotifications, QUEUE_LIMIT);
      await Promise.all(listOfNotificationList.map(
        async (notificationList: HydratedNotification[]): Promise<void> => {
          Logger.log(`
Enqueuing an email with ${notificationList.length} notifications for user ${recipient.id}.
          `);
          await EmailService.enqueueSend({
            params: { notifications: notificationList },
            templateName: 'batch_notification',
            to: recipient.email
          });
        }
      ));
    }));

    await NotificationsDAO.markSentTrx(hydratedNotifications.map(
      (hydratedNotification: HydratedNotification): string => hydratedNotification.id
    ), trx);
  });
}
