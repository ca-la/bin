import * as z from "zod";

export enum PlanStripePriceType {
  PER_SEAT = "PER_SEAT",
  BASE_COST = "BASE_COST",
}
export const planStripePriceTypeSchema = z.nativeEnum(PlanStripePriceType);

export const planStripePriceSchema = z.object({
  planId: z.string(),
  stripePriceId: z.string(),
  type: planStripePriceTypeSchema,
});
export type PlanStripePrice = z.infer<typeof planStripePriceSchema>;

export const planStripePriceRowSchema = z.object({
  plan_id: z.string(),
  stripe_price_id: z.string(),
  type: planStripePriceTypeSchema,
});
export type PlanStripePriceRow = z.infer<typeof planStripePriceRowSchema>;
