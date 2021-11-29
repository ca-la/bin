import { SubscriptionWithPlan } from "./types";
import {
  Plan,
  TeamPlanOption,
  calculatePerBillingIntervalPrice,
} from "../plans";

export function isSubscriptionFree(
  subscription: SubscriptionWithPlan
): boolean {
  return (
    subscription.plan.baseCostPerBillingIntervalCents === 0 &&
    subscription.plan.perSeatCostPerBillingIntervalCents === 0
  );
}

export function attachTeamOptionData(
  plan: Plan,
  billedUserCount: number
): TeamPlanOption {
  return {
    ...plan,
    billedUserCount,
    totalBillingIntervalCostCents: calculatePerBillingIntervalPrice(
      plan,
      billedUserCount
    ),
  };
}
