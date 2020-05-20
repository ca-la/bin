import process from "process";
import { CALA_OPS_USER_ID } from "../config";
import { log, logServerError } from "../services/logger";
import { green, reset } from "../services/colors";

import * as CreditsDAO from "../components/credits/dao";

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

  await CreditsDAO.addCredit({
    amountCents: Number(creditAmountString),
    createdBy: CALA_OPS_USER_ID,
    description: "Manual credit grant",
    expiresAt: null,
    givenTo: userId,
  });

  log(green, `Added ${creditAmountString} cents of credit`, reset);

  const newTotal = await CreditsDAO.getCreditAmount(userId);
  log(green, `New credit total is ${newTotal} cents`, reset);
}
