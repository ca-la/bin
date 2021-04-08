import { formatCentsToDollars } from "@cala/ts-lib";
import { Transaction } from "knex";

import db = require("../../services/db");
import { addReferralSubscriptionBonuses } from "../../components/referral-runs";
import Logger from "../../services/logger";

async function run() {
  return db.transaction((trx: Transaction) =>
    addReferralSubscriptionBonuses(trx)
  );
}

run()
  .then((creditTotalCents: number) => {
    Logger.log(
      `Successfully granted ${formatCentsToDollars(
        creditTotalCents
      )} credits for subscriptions`
    );
    process.exit(0);
  })
  .catch((error: Error): void => {
    Logger.logServerError(error.message);
    process.exit(1);
  });
