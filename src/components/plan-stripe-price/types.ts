import * as z from "zod";

export const planStripePriceSchema = z.object({
  planId: z.string(),
  stripePriceId: z.string(),
});
export type PlanStripePrice = z.infer<typeof planStripePriceSchema>;

export const planStripePriceRowSchema = z.object({
  plan_id: z.string(),
  stripe_price_id: z.string(),
});
export type PlanStripePriceRow = z.infer<typeof planStripePriceRowSchema>;
