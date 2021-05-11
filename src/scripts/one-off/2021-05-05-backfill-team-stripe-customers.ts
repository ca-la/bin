import process from "process";
import uuid from "node-uuid";

import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import * as StripeAPI from "../../services/stripe/api";
import db from "../../services/db";
import { SubscriptionRow } from "../../components/subscriptions";
import { CustomerRow } from "../../components/customers/types";

/*
Creates Customers from existing subscriptions
*/

type SubscriptionRowWithCustomerId = SubscriptionRow & { customer_id: string };

async function getStripeCustomerIdFromSubscription(
  subscription: SubscriptionRow
): Promise<SubscriptionRowWithCustomerId> {
  const stripeSub = await StripeAPI.getSubscription(
    subscription.stripe_subscription_id!
  );
  return {
    ...subscription,
    customer_id: stripeSub.customer,
  };
}

async function main(...args: string[]): Promise<string> {
  const isDryRun = !args.includes("--force");
  const trx = await db.transaction();

  try {
    const subscriptions: SubscriptionRow[] = await trx("subscriptions")
      .select("*")
      .whereRaw(
        `
          stripe_subscription_id IS NOT NULL
          AND (cancelled_at IS NULL OR cancelled_at > now())
          AND team_id IS NOT NULL
        `
      );

    log(
      `Found ${subscriptions.length} active team subscriptions with stripe IDs`
    );

    const subscriptionsWithCustomerId: SubscriptionRowWithCustomerId[] = [];
    let counter = 1;
    for (const sub of subscriptions) {
      log(
        `(${counter}/${subscriptions.length}) Fetching Stripe info for subscription ${sub.id}`
      );
      subscriptionsWithCustomerId.push(
        await getStripeCustomerIdFromSubscription(sub)
      );

      counter += 1;
    }

    const scriptTime = new Date();
    const customers: CustomerRow[] = subscriptionsWithCustomerId.map(
      (sub: SubscriptionRowWithCustomerId): CustomerRow => ({
        id: uuid.v4(),
        created_at: scriptTime,
        updated_at: scriptTime,
        deleted_at: null,
        provider: "STRIPE",
        customer_id: sub.customer_id,
        team_id: sub.team_id!,
        user_id: null,
      })
    );

    await trx("customers").insert(customers);
    log(`Created ${customers.length} team customers`);
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  if (isDryRun) {
    log("Dry run (run with --force to commit changes); rolling back...");
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
