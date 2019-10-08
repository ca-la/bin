import DataAdapter, { defaultEncoder } from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

type BillingInterval = 'MONTHLY' | 'ANNUALLY';

export interface Plan {
  id: string;
  billingInterval: BillingInterval;
  createdAt: Date;
  monthlyCostCents: number;
  revenueSharePercentage: number;
  stripePlanId: string;
  title: string;
  isDefault: boolean;
}

export interface PlanRow {
  id: string;
  billing_interval: BillingInterval;
  created_at: string;
  monthly_cost_cents: string;
  revenue_share_percentage: number;
  stripe_plan_id: string;
  title: string;
  is_default: boolean;
}

function encode(row: PlanRow): Plan {
  return {
    ...defaultEncoder<PlanRow, Plan>(row),
    monthlyCostCents: Number(row.monthly_cost_cents)
  };
}

export const dataAdapter = new DataAdapter<PlanRow, Plan>(encode);

export function isPlanRow(row: object): row is PlanRow {
  return hasProperties(
    row,
    'id',
    'billing_interval',
    'created_at',
    'monthly_cost_cents',
    'revenue_share_percentage',
    'stripe_plan_id',
    'title',
    'is_default'
  );
}

export function isPlan(data: object): data is Plan {
  return hasProperties(
    data,
    'id',
    'billingInterval',
    'createdAt',
    'monthlyCostCents',
    'revenueSharePercentage',
    'stripePlanId',
    'title',
    'isDefault'
  );
}
