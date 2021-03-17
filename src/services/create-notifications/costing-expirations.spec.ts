import { sandbox, test, Test } from "../../test-helpers/fresh";

import * as NotificationAnnouncer from "../../components/iris/messages/notification";
import Config from "../../config";
import {
  immediatelySendCostingExpiredNotification,
  immediatelySendOneWeekCostingExpirationNotification,
  immediatelySendTwoDayCostingExpirationNotification,
} from "./costing-expirations";
import createUser = require("../../test-helpers/create-user");
import generateCollection from "../../test-helpers/factories/collection";
import * as EmailService from "../../services/email";
import pick = require("lodash/pick");
import { NotificationType } from "../../components/notifications/domain-object";

test("immediatelySendCostingExpiredNotification", async (t: Test) => {
  const { user: calaOps } = await createUser({ withSession: false });

  const irisStub = sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const emailStub = sandbox()
    .stub(EmailService, "enqueueSend")
    .returns(Promise.resolve());
  sandbox().stub(Config, "CALA_OPS_USER_ID").value(calaOps.id);

  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection({
    createdBy: user.id,
  });

  const notification = await immediatelySendCostingExpiredNotification({
    collectionId: collection.id,
    recipientUserId: user.id,
  });

  t.equal(emailStub.callCount, 1, "sends the notification to SQS");
  t.equal(irisStub.callCount, 1, "sends a message to Iris SQS");

  t.deepEqual(
    pick(notification, "recipientUserId", "collectionId", "type"),
    {
      collectionId: collection.id,
      recipientUserId: user.id,
      type: NotificationType.COSTING_EXPIRED,
    },
    "Creates a notification for the right recipient and collection"
  );
});

test("immediatelySendTwoDayCostingExpirationNotification", async (t: Test) => {
  const { user: calaOps } = await createUser({ withSession: false });

  const irisStub = sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const emailStub = sandbox()
    .stub(EmailService, "enqueueSend")
    .returns(Promise.resolve());
  sandbox().stub(Config, "CALA_OPS_USER_ID").value(calaOps.id);

  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection({
    createdBy: user.id,
  });

  const notification = await immediatelySendTwoDayCostingExpirationNotification(
    {
      collectionId: collection.id,
      recipientUserId: user.id,
    }
  );

  t.equal(emailStub.callCount, 1, "sends the notification to SQS");
  t.equal(irisStub.callCount, 1, "sends a message to Iris SQS");

  t.deepEqual(
    pick(notification, "recipientUserId", "collectionId", "type"),
    {
      collectionId: collection.id,
      recipientUserId: user.id,
      type: NotificationType.COSTING_EXPIRATION_TWO_DAYS,
    },
    "Creates a notification for the right recipient and collection"
  );
});

test("immediatelySendOneWeekCostingExpirationNotification", async (t: Test) => {
  const { user: calaOps } = await createUser({ withSession: false });

  const irisStub = sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const emailStub = sandbox()
    .stub(EmailService, "enqueueSend")
    .returns(Promise.resolve());
  sandbox().stub(Config, "CALA_OPS_USER_ID").value(calaOps.id);

  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection({
    createdBy: user.id,
  });

  const notification = await immediatelySendOneWeekCostingExpirationNotification(
    {
      collectionId: collection.id,
      recipientUserId: user.id,
    }
  );

  t.equal(emailStub.callCount, 1, "sends the notification to SQS");
  t.equal(irisStub.callCount, 1, "sends a message to Iris SQS");

  t.deepEqual(
    pick(notification, "recipientUserId", "collectionId", "type"),
    {
      collectionId: collection.id,
      recipientUserId: user.id,
      type: NotificationType.COSTING_EXPIRATION_ONE_WEEK,
    },
    "Creates a notification for the right recipient and collection"
  );
});
