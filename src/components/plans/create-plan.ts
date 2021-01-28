import Knex from "knex";

import * as PlanStripePricesDAO from "../plan-stripe-price/dao";
import { PlanStripePrice } from "../plan-stripe-price/types";
import * as PlansDAO from "./dao";
import { PlanDb } from "./types";

export async function createPlan(
  trx: Knex.Transaction,
  plan: MaybeUnsaved<PlanDb>,
  stripePrices: Omit<PlanStripePrice, "planId">[]
) {
  const saved = await PlansDAO.create(trx, plan);

  await PlanStripePricesDAO.createAll(
    trx,
    stripePrices.map((price: Omit<PlanStripePrice, "planId">) => ({
      ...price,
      planId: saved.id,
    }))
  );

  const found = await PlansDAO.findById(trx, saved.id);

  if (!found) {
    throw new Error("Could not create plan");
  }

  return found;
}
