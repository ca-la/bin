import { Test, test, sandbox } from "../../test-helpers/simple";
import {
  NotificationType,
  UserDevice,
  userDeviceTestBlank,
} from "../../published-types";
import * as SQS from "../aws/sqs";
import * as UserDevicesDAO from "../../components/user-devices/dao";
import * as NotificationsService from "../../components/notifications/notification-messages";
import { sendPushNotifications } from ".";
import { FullNotification } from "../../components/notifications/domain-object";
import {
  AWS_NOTIFICATION_SQS_REGION,
  AWS_NOTIFICATION_SQS_URL,
} from "../../config";

function setup({ userDevices }: { userDevices: UserDevice[] }) {
  const userDevicesStub = sandbox()
    .stub(UserDevicesDAO, "find")
    .resolves(userDevices || []);
  const enqueueMessageStub = sandbox().stub(SQS, "enqueueMessage").resolves({});
  sandbox()
    .stub(NotificationsService, "createNotificationMessage")
    .resolves({ id: "notification-123" });

  return { userDevicesStub, enqueueMessageStub };
}

test("does not send for non-inbox notifications", async (t: Test) => {
  const { enqueueMessageStub } = setup({
    userDevices: [userDeviceTestBlank],
  });

  await sendPushNotifications(({
    recipientUserId: "userId",
    type: NotificationType.INVITE_TEAM_USER,
  } as unknown) as FullNotification);
  t.is(
    enqueueMessageStub.callCount,
    0,
    "Does not send for a non-inbox notifications"
  );
});
test("does not send notifications for notifications with no recipient id", async (t: Test) => {
  const { enqueueMessageStub } = setup({
    userDevices: [userDeviceTestBlank],
  });

  await sendPushNotifications(({
    recipientUserId: null,
    type: NotificationType.PARTNER_DESIGN_BID,
  } as unknown) as FullNotification);
  t.is(
    enqueueMessageStub.callCount,
    0,
    "Does not send for a notification with no recipient"
  );
});
test("does not push if the user has no devices", async (t: Test) => {
  const { enqueueMessageStub } = setup({
    userDevices: [],
  });

  await sendPushNotifications(({
    recipientUserId: "userId",
    type: NotificationType.PARTNER_DESIGN_BID,
  } as unknown) as FullNotification);
  t.is(
    enqueueMessageStub.callCount,
    0,
    "Does not send for a notification with no recipient"
  );
});

test("sends for inbox notifications with user devices", async (t: Test) => {
  const { enqueueMessageStub } = setup({
    userDevices: [userDeviceTestBlank],
  });

  await sendPushNotifications(({
    recipientUserId: "userId",
    type: NotificationType.PARTNER_DESIGN_BID,
  } as unknown) as FullNotification);
  t.deepEqual(
    enqueueMessageStub.args,
    [
      [
        {
          messageType: "push-notification",
          payload: {
            notificationMessage: { id: "notification-123" },
            userDevices: [userDeviceTestBlank],
          },
          queueRegion: AWS_NOTIFICATION_SQS_REGION,
          queueUrl: AWS_NOTIFICATION_SQS_URL,
        },
      ],
    ],
    "Sends a push notification with correct arguments"
  );
});
