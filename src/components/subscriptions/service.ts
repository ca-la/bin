import { SubscriptionWithPlan } from "./domain-object";

export function isSubscriptionFree(
  subscription: SubscriptionWithPlan
): boolean {
  return (
    subscription.plan.baseCostPerBillingIntervalCents === 0 &&
    subscription.plan.perSeatCostPerBillingIntervalCents === 0
  );
}
