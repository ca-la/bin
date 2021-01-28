import Knex from "knex";

import { dataAdapter } from "./adapter";
import { PlanStripePrice, PlanStripePriceRow } from "./types";

export async function createAll(
  trx: Knex.Transaction,
  prices: PlanStripePrice[]
) {
  const rows = await trx<PlanStripePriceRow>("plan_stripe_prices").insert(
    prices.map(dataAdapter.forInsertion.bind(dataAdapter)),
    "*"
  );

  if (rows.length !== prices.length) {
    throw new Error("Could not insert PlanStripePrice");
  }

  return dataAdapter.fromDbArray(rows);
}

export async function create(trx: Knex.Transaction, data: PlanStripePrice) {
  const rows = await createAll(trx, [data]);

  return rows[0];
}
