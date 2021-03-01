import Knex from "knex";

import { findCollectionTeamPlans } from "./dao";
import { Plan } from "./types";

export async function canCheckOutTeamCollection(
  ktx: Knex,
  collectionId: string
): Promise<boolean> {
  const plans = await findCollectionTeamPlans(ktx, collectionId);
  return plans.some((plan: Plan) => plan.canCheckOut);
}

export async function canSubmitTeamCollection(
  trx: Knex.Transaction,
  collectionId: string
): Promise<boolean> {
  const plans = await findCollectionTeamPlans(trx, collectionId);
  return plans.some((plan: Plan) => plan.canSubmit);
}
