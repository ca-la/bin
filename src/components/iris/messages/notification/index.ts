import { FullNotification } from "../../../notifications/domain-object";
import { createNotificationMessage } from "../../../notifications/notification-messages";
import { sendMessage } from "../../send-message";
import { RealtimeMessage, RealtimeMessageType } from "../../types";
import { buildChannelName } from "../../build-channel";

/**
 * Publishes a notification to the Iris SQS only if the notification has a recipient that is a user.
 */
export async function announceNotificationCreation(
  notification: FullNotification
): Promise<RealtimeMessage | null> {
  const messageNotification = await createNotificationMessage(notification);
  if (!notification.recipientUserId || !messageNotification) {
    return null;
  }

  const realtimeNotification: RealtimeMessage = {
    channels: [buildChannelName("updates", notification.recipientUserId)],
    resource: messageNotification,
    type: RealtimeMessageType.notificationCreated,
  };
  await sendMessage(realtimeNotification);
  return realtimeNotification;
}
