import process from "process";

import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import db from "../../services/db";
import { findOrCreateCustomerId } from "../../services/stripe";
import createStripeSubscription from "../../services/stripe/create-subscription";

/*
Create Stripe customer and subscription for every free subscription
and save stripe subscription id
*/

interface SubscriptionWithRelativeData {
  id: string;
  user_id: string | null;
  team_id: string | null;
  team_owner_user_id: string | null;
  stripe_plan_id: string;
}

async function main(...args: string[]): Promise<string> {
  const isDryRun = args.includes("--dry-run");
  const trx = await db.transaction();

  try {
    const subscriptionsWithRelativeData: SubscriptionWithRelativeData[] = await trx<
      SubscriptionWithRelativeData
    >("subscriptions")
      .select([
        "s.id",
        "s.user_id",
        "s.team_id",
        "tu.user_id as team_owner_user_id",
        "p.stripe_plan_id as stripe_plan_id",
      ])
      .from("subscriptions as s")
      .leftJoin("team_users as tu", function () {
        this.on("tu.team_id", "=", "s.team_id")
          .andOnNull("tu.deleted_at")
          .andOn("tu.role", "=", trx.raw("?", ["OWNER"]));
      })
      .leftJoin("plans as p", "p.id", "s.plan_id")
      .where({ stripe_subscription_id: null })
      .whereRaw("cancelled_at is null or cancelled_at > now()");

    log(
      `Found ${subscriptionsWithRelativeData.length} subscriptions without Stripe id`
    );

    let index: number = 0;
    for (const subscriptionWithData of subscriptionsWithRelativeData) {
      index += 1;
      const userId =
        subscriptionWithData.user_id || subscriptionWithData.team_owner_user_id;

      if (isDryRun) {
        log(
          `(${index}/${subscriptionsWithRelativeData.length}) Updating subscription with id ${subscriptionWithData.id} for user with id ${userId}`
        );
        continue;
      }

      const stripeCustomerId = await findOrCreateCustomerId(
        userId as string,
        trx
      );
      const stripeSubscription = await createStripeSubscription({
        stripeCustomerId,
        stripePlanId: subscriptionWithData.stripe_plan_id,
        stripeSourceId: null,
      });

      log(
        `(${index}/${subscriptionsWithRelativeData.length}) Updating subscription with id ${subscriptionWithData.id} with stripe id ${stripeSubscription.id}`
      );
      await trx("subscriptions")
        .update({ stripe_subscription_id: stripeSubscription.id })
        .where({ id: subscriptionWithData.id });

      await new Promise((resolve: (value: unknown) => void) => {
        setTimeout(resolve, 500);
      });
    }
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  if (isDryRun) {
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
