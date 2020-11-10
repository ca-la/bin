import tape from "tape";
import Knex from "knex";
import { isEqual } from "lodash";

import db from "../../services/db";
import * as SQSService from "../../services/aws/sqs";
import * as S3Service from "../../services/aws/s3";
import Configuration from "../../config";
import { sandbox, test } from "../../test-helpers/fresh";
import generateNotification from "../../test-helpers/factories/notification";
import { NotificationType } from "../notifications/domain-object";
import { createNotificationMessage } from "../notifications/notification-messages";
import * as NotificationAnnouncer from "../iris/messages/notification";
import { findById } from "../notifications/dao";

import { sendMessage } from "./send-message";
import { RealtimeMessageType, RealtimeMessage } from "./types";

test("sendMessage supports sending a message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const s3Stub = sandbox().stub(S3Service, "uploadToS3").resolves({
    bucketName: "iris-foo",
    remoteFilename: "abc-123",
  });
  const sqsStub = sandbox().stub(SQSService, "enqueueMessage").resolves({});
  sandbox().stub(Configuration, "AWS_IRIS_S3_BUCKET").value("iris-s3-foo");
  sandbox().stub(Configuration, "AWS_IRIS_SQS_URL").value("iris-sqs-url-bar");
  sandbox()
    .stub(Configuration, "AWS_IRIS_SQS_REGION")
    .value("iris-sqs-region-biz");

  const { notification } = await generateNotification({
    type: NotificationType.TASK_ASSIGNMENT,
  });
  const fullNotification = await db.transaction((trx: Knex.Transaction) =>
    findById(trx, notification.id)
  );
  if (!fullNotification) {
    throw new Error("Could not find notification");
  }
  const notificationMessage = await createNotificationMessage(fullNotification);

  if (!notificationMessage || !notification.recipientUserId) {
    throw new Error(
      "Expected there to be a notification message and a recipient!"
    );
  }

  const realtimeNotification: RealtimeMessage = {
    type: RealtimeMessageType.notificationCreated,
    channels: [`notifications/${notification.recipientUserId}`],
    resource: notificationMessage,
  };
  await sendMessage(realtimeNotification);

  const s3Upload: any = s3Stub.args.find((arg: any) =>
    isEqual(arg[0], {
      acl: "authenticated-read",
      bucketName: "iris-s3-foo",
      contentType: "application/json",
      resource: JSON.stringify(realtimeNotification),
    })
  );

  const sqsMessage: any = sqsStub.args.find((arg: any) =>
    isEqual(arg[0], {
      deduplicationId: `iris-foo-abc-123`,
      messageGroupId: "notification/created",
      messageType: "realtime-message",
      payload: {
        bucketName: "iris-foo",
        remoteFilename: "abc-123",
      },
      queueRegion: "iris-sqs-region-biz",
      queueUrl: "iris-sqs-url-bar",
    })
  );

  t.true(Boolean(s3Upload), "Called with the expected arguments");
  t.true(Boolean(sqsMessage), "Sends to SQS");
});
