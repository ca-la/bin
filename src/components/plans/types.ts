import * as z from "zod";
import {
  planStripePriceRowSchema,
  planStripePriceSchema,
} from "../plan-stripe-price/types";

export enum BillingInterval {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}
export const billingIntervalSchema = z.nativeEnum(BillingInterval);

export const planDbSchema = z.object({
  id: z.string(),
  billingInterval: billingIntervalSchema,
  createdAt: z.date(),
  monthlyCostCents: z.number(), // bigint
  revenueShareBasisPoints: z.number(),
  costOfGoodsShareBasisPoints: z.number(),
  fulfillmentFeesShareBasisPoints: z.number(),
  stripePlanId: z.string(),
  title: z.string(),
  isDefault: z.boolean(),
  isPublic: z.boolean(),
  description: z.string().nullable(),
  ordering: z.number().nullable(),
  baseCostPerBillingIntervalCents: z.number(), // bigint
  perSeatCostPerBillingIntervalCents: z.number(), // bigint
  canCheckOut: z.boolean(),
  canSubmit: z.boolean(),
  maximumSeatsPerTeam: z.number().nullable(),
  maximumCollections: z.number().int().positive().nullable(),
  includesFulfillment: z.boolean(),
  upgradeToPlanId: z.string().nullable(),
});
export type PlanDb = z.infer<typeof planDbSchema>;

export const planDbRowSchema = z.object({
  id: z.string(),
  billing_interval: billingIntervalSchema,
  created_at: z.date(),
  monthly_cost_cents: z.string(), // bigint
  revenue_share_basis_points: z.number(),
  cost_of_goods_share_basis_points: z.number(),
  fulfillment_fees_share_basis_points: z.number(),
  stripe_plan_id: z.string(),
  title: z.string(),
  is_default: z.boolean(),
  is_public: z.boolean(),
  description: z.string().nullable(),
  ordering: z.number().nullable(),
  base_cost_per_billing_interval_cents: z.string(), // bigint
  per_seat_cost_per_billing_interval_cents: z.string(), // bigint
  can_check_out: z.boolean(),
  can_submit: z.boolean(),
  maximum_seats_per_team: z.string().nullable(),
  maximum_collections: z.string().nullable(),
  includes_fulfillment: z.boolean(),
  upgrade_to_plan_id: z.string().nullable(),
});
export type PlanDbRow = z.infer<typeof planDbRowSchema>;

export const planSchema = planDbSchema.extend({
  stripePrices: z.array(planStripePriceSchema),
});
export type Plan = z.infer<typeof planSchema>;

export const teamPlanOptionSchema = planSchema.extend({
  billedUserCount: z.number(),
  totalBillingIntervalCostCents: z.number(),
});

export type TeamPlanOption = z.infer<typeof teamPlanOptionSchema>;

export const planRowSchema = planDbRowSchema.extend({
  stripe_prices: z.array(planStripePriceRowSchema),
});
export type PlanRow = z.infer<typeof planRowSchema>;

export const createPlanRequestSchema = z.object({
  billingInterval: billingIntervalSchema,
  revenueShareBasisPoints: z.number(),
  costOfGoodsShareBasisPoints: z.number(),
  fulfillmentFeesShareBasisPoints: z.number(),
  stripePlanId: z.string(),
  title: z.string(),
  isDefault: z.boolean(),
  description: z.string().nullable(),
  baseCostPerBillingIntervalCents: z.number(),
});
export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>;
