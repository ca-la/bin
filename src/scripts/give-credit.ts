import Knex from "knex";
import db from "../services/db";
import process from "process";
import { CALA_OPS_USER_ID } from "../config";
import { log, logServerError } from "../services/logger";
import { green, reset } from "../services/colors";

import { CreditsDAO, CreditType } from "../components/credits";

run()
  .then(() => {
    log(`${green}Successfully credited!`);
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
    throw new Error("Usage: give-credit.ts [userId] [amount in cents]");
  }

  await db.transaction(async (trx: Knex.Transaction) => {
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: Number(creditAmountString),
      createdBy: CALA_OPS_USER_ID,
      description: "Manual credit grant",
      expiresAt: null,
      givenTo: userId,
      financingAccountId: null,
    });
  });

  log(green, `Added ${creditAmountString} cents of credit`, reset);

  const newTotal = await CreditsDAO.getCreditAmount(userId);
  log(green, `New credit total is ${newTotal} cents`, reset);
}
