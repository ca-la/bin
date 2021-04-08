import * as z from "zod";

export const referralRunSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  latestStripeInvoiceId: z.string(),
});
export type ReferralRun = z.infer<typeof referralRunSchema>;

export const referralRunRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  latest_stripe_invoice_id: z.string(),
});
export type ReferralRunRow = z.infer<typeof referralRunRowSchema>;
