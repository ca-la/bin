import * as Knex from "knex";
import fs from "fs";
import parse from "csv-parse/lib/sync";
import uuid from "node-uuid";

import { create as createSubscription } from "../components/subscriptions/dao";
import { findByEmail } from "../components/users/dao";
import db from "../services/db";
import { log, logClientError } from "../services/logger";

function fail(msg: string): never {
  logClientError(msg);
  logClientError("All operations will be rolled back.");
  process.exit(1);
}

async function run(args: string[]): Promise<void> {
  const planId = args[2];
  const csvPath = args[3];

  if (!planId || !csvPath) {
    fail("Usage: create-subscriptions.ts [plan ID] [path to CSV]");
  }

  if (!fs.existsSync(csvPath)) {
    fail("CSV file not found");
  }

  const csvText = fs.readFileSync(csvPath).toString();
  const rows = parse(csvText);

  log(`Read ${rows.length} rows`);

  await db.transaction(async (trx: Knex.Transaction) => {
    for (const row of rows) {
      const [email] = row;
      if (typeof email !== "string") {
        fail(
          "Potentially malformed CSV. Expecting a single column with no header, containing only email addresses"
        );
      }

      log(`Attempting to subscribe user with email ${email}`);

      const user = await findByEmail(email);
      if (!user) {
        fail(`No such user: ${email}`);
      }

      log(`  ... found user ID ${user.id}`);

      const subscription = await createSubscription(
        {
          id: uuid.v4(),
          cancelledAt: null,
          planId,
          paymentMethodId: null,
          stripeSubscriptionId: null,
          userId: user.id,
          teamId: null,
          isPaymentWaived: true,
        },
        trx
      );
      log(`  ... created subscription ID ${subscription.id}`);
    }
  });

  log(`Success!`);
  process.exit(0);
}

run(process.argv);
