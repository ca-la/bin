import process from "process";
import { chunk } from "lodash";

import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import db from "../../services/db";
import {
  PlanStripePriceRow,
  PlanStripePriceType,
} from "../../components/plan-stripe-price/types";

/*
Copy `Plan.stripePlanId` into a `PlanStripePrice`
*/

async function main(...args: string[]): Promise<string> {
  const trx = await db.transaction();

  try {
    const planStripePlans = await trx<{ id: string; stripe_plan_id: string }>(
      "plans"
    ).select(["id", "stripe_plan_id"]);
    log(`Found ${planStripePlans.length} plans`);
    const stripePricesToInsert: PlanStripePriceRow[] = [];

    for (const { id, stripe_plan_id } of planStripePlans) {
      stripePricesToInsert.push({
        plan_id: id,
        stripe_price_id: stripe_plan_id,
        type: PlanStripePriceType.BASE_COST,
      });
    }

    for (const insertChunk of chunk(stripePricesToInsert, 1000)) {
      await trx("plan_stripe_prices").insert(insertChunk);
    }
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  if (args.includes("--dry-run")) {
    log("Dry run; rolling back...");
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
