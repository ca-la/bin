import * as z from "zod";

export const paymentMethodRowSchema = z.object({
  id: z.string(),
  created_at: z.date().nullable(),
  deleted_at: z.date().nullable(),
  user_id: z.string(),
  stripe_customer_id: z.string(),
  stripe_source_id: z.string(),
  last_four_digits: z.string(),
});
export type PaymentMethodRow = z.infer<typeof paymentMethodRowSchema>;

export const paymentMethodSchema = z.object({
  id: z.string(),
  createdAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  userId: z.string(),
  stripeCustomerId: z.string(),
  stripeSourceId: z.string(),
  lastFourDigits: z.string(),
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
