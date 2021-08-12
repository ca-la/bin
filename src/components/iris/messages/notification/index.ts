import { FullNotification } from "../../../notifications/domain-object";
import { createNotificationMessage } from "../../../notifications/notification-messages";
import { sendMessage } from "../../send-message";
import { realtimeNotificationCreated } from "../../../notifications/realtime";

/**
 * Publishes a notification to the Iris SQS only if the notification has a recipient that is a user.
 */
export async function announceNotificationCreation(
  notification: FullNotification
): Promise<void> {
  const notificationMessage = await createNotificationMessage(notification);
  if (!notification.recipientUserId || !notificationMessage) {
    return;
  }

  await sendMessage(
    realtimeNotificationCreated(
      notification.recipientUserId,
      notificationMessage
    )
  );
}
