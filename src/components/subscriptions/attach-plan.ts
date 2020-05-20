import { Subscription, SubscriptionWithPlan } from "./domain-object";
import * as PlansDAO from "../plans/dao";

export default async function atttachPlan(
  subscription: Subscription
): Promise<SubscriptionWithPlan> {
  const plan = await PlansDAO.findById(subscription.planId);

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
