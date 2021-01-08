import Knex from "knex";

import { validateEvery } from "../../services/validate-from-db";
import { dataAdapter, isPlanRow, Plan, PlanRow } from "./domain-object";

export default async function findCollectionTeamPlans(
  trx: Knex.Transaction,
  collectionId: string
): Promise<Plan[]> {
  const result = await trx("collections")
    .innerJoin("subscriptions", "collections.team_id", "subscriptions.team_id")
    .innerJoin("plans", "subscriptions.plan_id", "plans.id")
    .whereRaw(
      `
      collections.id = ? and (
        subscriptions.cancelled_at is null or
        subscriptions.cancelled_at > now()
      )
    `,
      [collectionId]
    )
    .select("plans.*");

  return validateEvery<PlanRow, Plan>("plans", isPlanRow, dataAdapter, result);
}

export async function canCheckOutTeamCollection(
  trx: Knex.Transaction,
  collectionId: string
): Promise<boolean> {
  const plans = await findCollectionTeamPlans(trx, collectionId);
  return plans.some((plan: Plan) => plan.canCheckOut);
}

export async function canSubmitTeamCollection(
  trx: Knex.Transaction,
  collectionId: string
): Promise<boolean> {
  const plans = await findCollectionTeamPlans(trx, collectionId);
  return plans.some((plan: Plan) => plan.canSubmit);
}
