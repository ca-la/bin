import { Notification } from '../../components/notifications/domain-object';
import User from '../../components/users/domain-object';
import EmailService from '../../services/email';
import { createNotificationMessage } from '../../components/notifications/notification-messages';

export default async function sendNotification(
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
