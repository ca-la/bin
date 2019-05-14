import { Notification } from '../../notifications/domain-object';
import { RealtimeNotification } from '@cala/ts-lib';
import { createNotificationMessage } from '../../notifications/notification-messages';
import { sendMessage } from '../send-message';

/**
 * Publishes a notification to the Iris SQS only if the notification has a recipient that is a user.
 */
export async function announceNotificationUpdate(
  notification: Notification
): Promise<RealtimeNotification | null> {
  const messageNotification = await createNotificationMessage(notification);
  if (!notification.recipientUserId || !messageNotification) {
    return null;
  }

  const realtimeNotification: RealtimeNotification = {
    actorId: notification.actorUserId,
    resource: messageNotification,
    targetId: notification.recipientUserId,
    type: 'notification'
  };
  await sendMessage(realtimeNotification);
  return realtimeNotification;
}
