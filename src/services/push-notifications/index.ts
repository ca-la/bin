import Knex from "knex";

import * as SQS from "../aws/sqs";
import {
  AWS_NOTIFICATION_SQS_REGION,
  AWS_NOTIFICATION_SQS_URL,
} from "../../config";
import db from "../db";
import {
  FullNotification,
  INBOX_NOTIFICATION_TYPES,
} from "../../components/notifications/domain-object";
import { NotificationMessage } from "../../components/notifications/types";
import * as UserDevicesDAO from "../../components/user-devices/dao";
import { UserDevice } from "../../components/user-devices/types";
import { logServerError } from "../logger";
import { createNotificationMessage } from "../../components/notifications/notification-messages";

export interface PushNotificationBody {
  notificationMessage: NotificationMessage;
  userDevices: UserDevice[];
}

export async function sendPushNotifications(
  notification: FullNotification,
  trx?: Knex.Transaction
): Promise<void> {
  const { recipientUserId, type } = notification;
  if (!INBOX_NOTIFICATION_TYPES.includes(type) || !recipientUserId) {
    return;
  }

  const userDevices = await UserDevicesDAO.find(trx || db, {
    userId: recipientUserId,
  });

  if (userDevices.length === 0) {
    return;
  }

  const notificationMessage = await createNotificationMessage(notification);
  if (!notificationMessage) {
    return;
  }

  try {
    await SQS.enqueueMessage({
      messageType: "push-notification",
      payload: {
        notificationMessage,
        userDevices,
      },
      queueRegion: AWS_NOTIFICATION_SQS_REGION,
      queueUrl: AWS_NOTIFICATION_SQS_URL,
    });
  } catch (err) {
    logServerError(
      `Failed to send push notificiation message for notification ${notification.id}`,
      err
    );
  }
}
