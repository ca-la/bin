import * as process from 'process';

import * as CreditsDAO from '../components/credits/dao';
import db = require('../services/db');
import { CALA_OPS_USER_ID } from '../config';
import { green, reset } from '../services/colors';
import { log, logServerError } from '../services/logger';

// Brings the credit amount of users in a given cohort all up to a minimum
// level.
//
// For example, if the cohort had 2 users, one with $0 credit, and one with
// $100, then we called this script to give them all $200, user 1 would receive
// $100 and user 2 would receive $100, bringing both to $200.

run()
  .then(() => {
    log(`${green}Successfully credited users!`);
    process.exit();
  })
  .catch((err: any): void => {
    logServerError(err);
    process.exit(1);
  });

async function run(): Promise<void> {
  const cohortId = process.argv[2];
  const creditAmountString = process.argv[3];

  if (!cohortId || !creditAmountString) {
    throw new Error('Usage: top-off-cohort-credits.ts [cohortId] [amount in cents]');
  }

  const creditAmountCents = Number(creditAmountString);

  const { rows: cohortUsers } = await db.raw(
    'select * from cohort_users where cohort_id = ?',
    [cohortId]
  );

  log(green, `Found ${cohortUsers.length} users in cohort ${cohortId}`, reset);

  for (const cohortUser of cohortUsers) {
    const userId = cohortUser.user_id;
    const existingCredits = await CreditsDAO.getCreditAmount(userId);
    log(green, `User ${userId} has ${existingCredits} cents of existing credit`);
    const amountToAdd = Math.max(0, creditAmountCents - existingCredits);

    if (amountToAdd > 0) {
      log(green, `Adding ${amountToAdd} cents of credit`, reset);
      await CreditsDAO.addCredit({
        amountCents: amountToAdd,
        createdBy: CALA_OPS_USER_ID,
        description: 'Manual credit grant',
        expiresAt: null,
        givenTo: userId
      });
      log(green, 'Done!', reset);
    } else {
      log(green, 'No more credits needed, skipping', reset);
    }
  }
}
