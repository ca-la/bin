import DataAdapter, { defaultEncoder } from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import { BillingInterval, Plan } from "./plan";

export { BillingInterval, Plan } from "./plan";

export interface PlanRow {
  id: string;
  billing_interval: BillingInterval;
  created_at: string;
  monthly_cost_cents: string;
  revenue_share_basis_points: number;
  cost_of_goods_share_basis_points: number;
  stripe_plan_id: string;
  title: string;
  is_default: boolean;
  is_public: boolean;
  description: string | null;
  ordering: number | null;
}

function encode(row: PlanRow): Plan {
  return {
    ...defaultEncoder<PlanRow, Plan>(row),
    monthlyCostCents: Number(row.monthly_cost_cents),
  };
}

export const dataAdapter = new DataAdapter<PlanRow, Plan>(encode);

export function isPlanRow(row: object): row is PlanRow {
  return hasProperties(
    row,
    "id",
    "billing_interval",
    "created_at",
    "monthly_cost_cents",
    "revenue_share_basis_points",
    "cost_of_goods_share_basis_points",
    "stripe_plan_id",
    "title",
    "is_default",
    "is_public",
    "description",
    "ordering"
  );
}

export function isPlan(data: object): data is Plan {
  return hasProperties(
    data,
    "id",
    "billingInterval",
    "createdAt",
    "monthlyCostCents",
    "revenueShareBasisPoints",
    "costOfGoodsShareBasisPoints",
    "stripePlanId",
    "title",
    "isDefault",
    "isPublic",
    "description",
    "ordering"
  );
}
