export type BillingInterval = 'MONTHLY' | 'ANNUALLY';

export interface Plan {
  id: string;
  billingInterval: BillingInterval;
  createdAt: Date;
  monthlyCostCents: number;
  revenueSharePercentage: number;
  stripePlanId: string;
  title: string;
  isDefault: boolean;
  isPublic: boolean;
  description: string | null;
  ordering: number | null;
}
