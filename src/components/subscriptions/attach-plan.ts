import Knex from "knex";
import { Subscription, SubscriptionWithPlan } from "./domain-object";
import * as PlansDAO from "../plans/dao";
import db from "../../services/db";

export default async function attachPlan(
  subscription: Subscription
): Promise<SubscriptionWithPlan> {
  const plan = await db.transaction((trx: Knex.Transaction) =>
    PlansDAO.findById(trx, subscription.planId)
  );

  if (!plan) {
    throw new Error(
      `Subscription ${subscription.id} has an invalid Plan ID: ${subscription.planId}`
    );
  }

  return {
    ...subscription,
    plan,
  };
}
