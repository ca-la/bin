import process from "process";

import { log, logServerError } from "../../services/logger";
import { format, blue, green } from "../../services/colors";
import dao from "../../components/referral-redemptions/dao";
import db from "../../services/db";
import { addCredit } from "../../components/credits/dao";
import { REFERRED_USER_SIGNUP_CENTS } from "../../components/referral-redemptions/grant-checkout-credits";

async function main(...args: string[]): Promise<string> {
  const isDryRun = !args.includes("--force");
  const trx = await db.transaction();

  try {
    log(format(blue, "Locking referral_redemptions"));
    await trx.raw(`
      select * from referral_redemptions
      where referred_user_signup_credit_id is null
      for update;
    `);

    log(
      format(
        blue,
        "Finding referral_redemptions with referred_user_signup_credit_id = null..."
      )
    );
    const redemptions = await dao.find(trx, {
      referredUserSignupCreditId: null,
    });

    log(
      format(
        blue,
        `Found ${redemptions.length} referral_redemptions. Adding signup credits to referred users...`
      )
    );

    for (const redemption of redemptions) {
      const creditId = await addCredit(
        {
          description: `Referral credit for signup`,
          amountCents: REFERRED_USER_SIGNUP_CENTS,
          createdBy: redemption.referredUserId,
          givenTo: redemption.referredUserId,
          expiresAt: new Date(
            redemption.createdAt.setFullYear(
              redemption.createdAt.getFullYear() + 1
            )
          ),
        },
        trx
      );

      await dao.update(trx, redemption.id, {
        referredUserSignupCreditId: creditId,
      });

      log(
        format(green, `Added credits for user #${redemption.referredUserId}`)
      );
    }

    log(format(blue, `Verifying that no referral_redemptions remain...`));

    const remainder = await dao.find(trx, {
      referredUserSignupCreditId: null,
    });

    if (remainder.length !== 0) {
      throw new Error(
        `Unexpectedly found ${remainder.length} referral_redemptions remaining`
      );
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
