import process from "process";

import { log, logServerError } from "../../services/logger";
import { format, blue, green } from "../../services/colors";
import { UserRow } from "../../components/users/types";
import db from "../../services/db";
import { generateReferralCode } from "../../components/referral-codes/service";

async function main(...args: string[]): Promise<string> {
  const isDryRun = !args.includes("--force");
  const trx = await db.transaction();

  try {
    log(format(blue, "Finding users with no referral codes..."));

    const users: UserRow[] = await trx("users").whereRaw(
      "lower(referral_code) = ?",
      "n/a"
    );

    log(format(blue, `Found ${users.length} users. Setting referral codes...`));

    for (const user of users) {
      const referralCode = await generateReferralCode();
      const updated = await trx("users").where({ id: user.id }).update(
        {
          referral_code: referralCode,
        },
        "*"
      );

      if (updated.length !== 1) {
        throw new Error(
          `Unexpectedly updated ${updated.length} users for ID ${user.id}`
        );
      }

      log(
        format(green, `Set code ${referralCode} for user ${updated[0].email}`)
      );
    }

    log(format(blue, `Verifying that no users remain...`));

    const remainder: UserRow[] = await trx("users").whereRaw(
      "lower(referral_code) = ?",
      "n/a"
    );

    if (remainder.length !== 0) {
      throw new Error(`Unexpectedly found ${remainder.length} users remaining`);
    }
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  if (isDryRun) {
    log("⚠️  Dry run; rolling back (run with --force to commit changes)...");
    await trx.rollback();
  } else {
    log("Committing...");
    await trx.commit();
  }

  return format(green, "Success!");
}

main(...process.argv.slice(1))
  .catch((err: any) => {
    logServerError(err);
    process.exit(1);
  })
  .then((message: string) => {
    log(message);
    process.exit(0);
  });
