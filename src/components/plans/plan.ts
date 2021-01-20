export enum BillingInterval {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

export interface Plan {
  id: string;
  billingInterval: BillingInterval;
  createdAt: Date;
  monthlyCostCents: number;
  revenueShareBasisPoints: number;
  costOfGoodsShareBasisPoints: number;
  stripePlanId: string;
  title: string;
  isDefault: boolean;
  isPublic: boolean;
  description: string | null;
  ordering: number | null;
  baseCostPerBillingIntervalCents: number;
  perSeatCostPerBillingIntervalCents: number;
  canCheckOut: boolean;
  canSubmit: boolean;
  maximumSeatsPerTeam: number | null;
  includesFulfillment: boolean;
  upgradeToPlanId: string | null;
}
