import DataAdapter, { defaultEncoder } from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import { BillingInterval, Plan } from "./plan";
import parseNumericString from "../../services/parse-numeric-string";

export { BillingInterval, Plan } from "./plan";

export interface PlanRow {
  id: string;
  billing_interval: BillingInterval;
  created_at: string;

  // TODO: This column is deprecated in favor of `base_cost...` and will be
  // removed once all references are updated.
  monthly_cost_cents: string; // bigint
  revenue_share_basis_points: number;
  cost_of_goods_share_basis_points: number;
  stripe_plan_id: string;
  title: string;
  is_default: boolean;
  is_public: boolean;
  description: string | null;
  ordering: number | null;
  base_cost_per_billing_interval_cents: string | null; // bigint
  per_seat_cost_per_billing_interval_cents: string; // bigint
  can_check_out: boolean;
  can_submit: boolean;
  maximum_seats_per_team: string | null; // bigint
}

function encode(row: PlanRow): Plan {
  return {
    ...defaultEncoder<PlanRow, Plan>(row),
    monthlyCostCents: parseNumericString(row.monthly_cost_cents),
    baseCostPerBillingIntervalCents:
      row.base_cost_per_billing_interval_cents === null
        ? null
        : parseNumericString(row.base_cost_per_billing_interval_cents),
    perSeatCostPerBillingIntervalCents: parseNumericString(
      row.per_seat_cost_per_billing_interval_cents
    ),
    maximumSeatsPerTeam:
      row.maximum_seats_per_team === null
        ? null
        : parseNumericString(row.maximum_seats_per_team),
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
    "ordering",
    "base_cost_per_billing_interval_cents",
    "per_seat_cost_per_billing_interval_cents",
    "can_check_out",
    "can_submit",
    "maximum_seats_per_team"
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
    "ordering",
    "baseCostPerBillingIntervalCents",
    "perSeatCostPerBillingIntervalCents",
    "canCheckOut",
    "canSubmit",
    "maximumSeatsPerTeam"
  );
}

function isBillingInterval(
  billingInterval: any
): billingInterval is BillingInterval {
  return Object.values(BillingInterval).includes(billingInterval);
}

export function isCreatePlanInputRequest(
  plan: Record<string, any>
): plan is Unsaved<Plan> {
  const keyset = new Set(Object.keys(plan));

  const isRequiredFieldsProvided = [
    "billingInterval",
    "monthlyCostCents",
    "revenueShareBasisPoints",
    "costOfGoodsShareBasisPoints",
    "stripePlanId",
    "title",
    "isDefault",
    "description",
  ].every(keyset.has.bind(keyset));

  return isRequiredFieldsProvided && isBillingInterval(plan.billingInterval);
}
