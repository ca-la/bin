import Knex from "knex";
import generateNotification from "../../test-helpers/factories/notification";
import { db, test, Test } from "../../test-helpers/fresh";
import * as NotificationsDAO from "./dao";
import { createNotificationMessage } from "./notification-messages";
import { NotificationType, serializedNotificationMessageSchema } from "./types";

test("serializedNotificationMessageSchema: valid", async (t: Test) => {
  const { notification } = await generateNotification({
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  const fullNotification = await db.transaction((trx: Knex.Transaction) =>
    NotificationsDAO.findById(trx, notification.id)
  );

  const notificationMessage = await createNotificationMessage(
    fullNotification!
  );

  const result = serializedNotificationMessageSchema.safeParse(
    JSON.parse(JSON.stringify(notificationMessage))
  );

  t.true(result.success, "parses successfully");
  t.deepEqual(
    result.success && result.data,
    notificationMessage,
    "returns the deserialized notification message"
  );
});
