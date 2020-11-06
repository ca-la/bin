import { sendNotificationEmails } from "../../services/send-notification-emails";
import Logger from "../../services/logger";
import "../../services/aws";
import "../../components/cala-components";

sendNotificationEmails()
  .then((sentCount: number): void => {
    Logger.log(`Successfully sent ${sentCount} notifications!`);
    process.exit(0);
  })
  .catch((error: Error): void => {
    Logger.logServerError(error.message);
    process.exit(1);
  });
