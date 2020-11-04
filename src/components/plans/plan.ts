export type BillingInterval = "MONTHLY" | "ANNUALLY";

export interface Plan {
  id: string;
  billingInterval: BillingInterval;
  createdAt: Date;
  monthlyCostCents: number;
  revenueShareBasisPoints: number;
  costOfGoodsShareBasisPoints: number;

  // This is superseded by `revenueShareBasisPoints` and safe to remove once
  // Studio no longer depends on it.
  revenueSharePercentage: number;

  stripePlanId: string;
  title: string;
  isDefault: boolean;
  isPublic: boolean;
  description: string | null;
  ordering: number | null;
}
