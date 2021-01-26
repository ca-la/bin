import Knex from "knex";

import { dataAdapter } from "./adapter";
import { PlanStripePrice } from "./types";

export async function create(trx: Knex.Transaction, data: PlanStripePrice) {
  const rows = await trx
    .insert(dataAdapter.forInsertion(data), "*")
    .into("plan_stripe_prices");

  if (rows.length !== 1) {
    throw new Error("Could not insert PlanStripePrice");
  }

  const inserted = rows[0];

  return dataAdapter.fromDb(inserted);
}
