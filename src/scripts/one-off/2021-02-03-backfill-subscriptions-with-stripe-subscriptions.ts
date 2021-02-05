import process from "process";

import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import db from "../../services/db";
import { findOrCreateCustomerId } from "../../services/stripe";
import createStripeSubscription from "../../services/stripe/create-subscription";
import { PlanStripePriceRow } from "../../components/plan-stripe-price/types";
import TeamUsersDAO from "../../components/team-users/dao";
import { dataAdapter as stripePriceDataAdapter } from "../../components/plan-stripe-price/adapter";

/*
Create Stripe customer and subscription for every free subscription
and save stripe subscription id
*/

interface SubscriptionWithRelativeData {
  id: string;
  user_id: string | null;
  team_id: string | null;
  team_owner_user_id: string | null;
  stripe_prices: PlanStripePriceRow[];
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
        trx.raw(`
          COALESCE(
            JSON_AGG(plan_stripe_prices)
                    FILTER (WHERE plan_stripe_prices.plan_id IS NOT NULL),
            '[]'
          ) AS stripe_prices`),
      ])
      .from("subscriptions as s")
      .leftJoin("team_users as tu", function () {
        this.on("tu.team_id", "=", "s.team_id")
          .andOnNull("tu.deleted_at")
          .andOn("tu.role", "=", trx.raw("?", ["OWNER"]));
      })
      .leftJoin("plans as p", "p.id", "s.plan_id")
      .leftJoin("plan_stripe_prices", "plan_stripe_prices.plan_id", "p.id")
      .where({ stripe_subscription_id: null })
      .whereRaw("cancelled_at is null or cancelled_at > now()")
      .groupBy(["s.id", "tu.user_id"]);

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
        stripePrices: stripePriceDataAdapter.fromDbArray(
          subscriptionWithData.stripe_prices
        ),
        stripeSourceId: null,
        seatCount: subscriptionWithData.team_id
          ? await TeamUsersDAO.countNonViewers(
              trx,
              subscriptionWithData.team_id
            )
          : null,
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
