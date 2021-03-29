import { Plan } from "./types";

export function calculatePerBillingIntervalPrice<
  T extends Pick<
    Plan,
    "baseCostPerBillingIntervalCents" | "perSeatCostPerBillingIntervalCents"
  >
>(plan: T, billedUserCount: number) {
  return (
    plan.baseCostPerBillingIntervalCents +
    billedUserCount * plan.perSeatCostPerBillingIntervalCents
  );
}

export function isPlanFree<
  T extends Pick<
    Plan,
    "baseCostPerBillingIntervalCents" | "perSeatCostPerBillingIntervalCents"
  >
>(plan: T) {
  return (
    plan.baseCostPerBillingIntervalCents === 0 &&
    plan.perSeatCostPerBillingIntervalCents === 0
  );
}
