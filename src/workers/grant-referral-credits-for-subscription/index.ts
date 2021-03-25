import { formatCentsToDollars } from "@cala/ts-lib";
import { Transaction } from "knex";

import db = require("../../services/db");
import { grantSubscriptionCredits } from "../../components/referral-redemptions/service";
import Logger from "../../services/logger";

async function run() {
  return db.transaction((trx: Transaction) => grantSubscriptionCredits(trx));
}

run()
  .then((creditTotalCents: number) => {
    Logger.log(
      `Successfully granted ${formatCentsToDollars(
        creditTotalCents
      )} credits for checkouts`
    );
    process.exit(0);
  })
  .catch((error: Error): void => {
    Logger.logServerError(error.message);
    process.exit(1);
  });
