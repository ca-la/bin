import process from "process";
import Knex from "knex";

import { CALA_OPS_USER_ID } from "../config";
import { log, logServerError } from "../services/logger";
import { green, reset } from "../services/colors";

import { CreditsDAO, CreditType } from "../components/credits";
import db from "../services/db";

run()
  .then(() => {
    log(`${green}Successfully removed credit!`);
    process.exit();
  })
  .catch((err: any): void => {
    logServerError(err);
    process.exit(1);
  });

async function run(): Promise<void> {
  const userId = process.argv[2];
  const creditAmountString = process.argv[3];

  if (!userId || !creditAmountString) {
    throw new Error("Usage: remove-credit.ts [userId] [amount in cents]");
  }

  await db.transaction(async (trx: Knex.Transaction) => {
    await CreditsDAO.create(trx, {
      type: CreditType.REMOVE,
      creditDeltaCents: -Number(creditAmountString),
      createdBy: CALA_OPS_USER_ID,
      description: "Manual reduction of credit",
      expiresAt: null,
      givenTo: userId,
    });
  });

  log(green, `Removed ${creditAmountString} cents of credit`, reset);

  const newTotal = await CreditsDAO.getCreditAmount(userId);
  log(green, `New credit total is ${newTotal} cents`, reset);
}
