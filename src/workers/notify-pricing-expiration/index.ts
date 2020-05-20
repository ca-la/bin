import {
  ExpirationResponse,
  notifyPricingExpirations,
} from "../../services/notify-pricing-expirations";
import Logger from "../../services/logger";
import "../../services/aws";

notifyPricingExpirations()
  .then((expirationCounts: ExpirationResponse): void => {
    Logger.log(
      `Successfully sent ${
        expirationCounts.justNowCount +
        expirationCounts.oneWeekCount +
        expirationCounts.twoDayCount
      } price expiration notifications.`
    );
    process.exit(0);
  })
  .catch((error: Error): void => {
    Logger.logServerError(error.message);
    process.exit(1);
  });
