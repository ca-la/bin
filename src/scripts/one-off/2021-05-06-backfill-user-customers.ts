import process from "process";

import { PaymentMethodRow } from "../../components/payment-methods/types";
import { CustomerRow } from "../../components/customers/types";
import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import db from "../../services/db";
import uuid from "node-uuid";

/*
Creates user Customers from existing payment methods
*/

async function main(...args: string[]): Promise<string> {
  const isDryRun = !args.includes("--force");
  const trx = await db.transaction();

  try {
    // get list of unique customers via payment_methods
    const paymentMethods: PaymentMethodRow[] = await trx("payment_methods")
      .select("*")
      .distinct("stripe_customer_id")
      .whereRaw(`user_id IS NOT NULL`);

    log(`Found ${paymentMethods.length} unique Stripe customer IDs`);

    // insert all those customers
    const scriptTime = new Date();
    const customers: CustomerRow[] = paymentMethods.map(
      (paymentMethod: PaymentMethodRow): CustomerRow => ({
        id: uuid.v4(),
        created_at: scriptTime,
        updated_at: scriptTime,
        deleted_at: null,
        provider: "STRIPE",
        customer_id: paymentMethod.stripe_customer_id,
        team_id: null,
        user_id: paymentMethod.user_id!,
      })
    );
    await trx("customers").insert(customers);
    log(`Created ${customers.length} team customers`);

    // associate all payment_methods with the newly made CALA user customers
    await trx.raw(`
      UPDATE
        payment_methods
      SET
        customer_id = customers.id
      FROM customers
      WHERE
        payment_methods.stripe_customer_id = customers.customer_id
        AND customers.team_id IS NULL
    `);

    const check: PaymentMethodRow[] = await trx("payment_methods")
      .select("*")
      .where({ customer_id: null });

    if (check.length !== 0) {
      log(check);
      throw new Error(
        "Validation check failed, all payment methods should have a customer_id"
      );
    }
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
