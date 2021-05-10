import * as z from "zod";

export const paymentMethodRowSchema = z.object({
  id: z.string(),
  created_at: z.date().nullable(),
  deleted_at: z.date().nullable(),
  user_id: z.string().nullable(),
  stripe_customer_id: z.string(),
  stripe_source_id: z.string(),
  last_four_digits: z.string(),
  customer_id: z.string().nullable(),
});
export type PaymentMethodRow = z.infer<typeof paymentMethodRowSchema>;

export const paymentMethodSchema = z.object({
  id: z.string(),
  createdAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  userId: z.string().nullable(),
  stripeCustomerId: z.string(),
  stripeSourceId: z.string(),
  lastFourDigits: z.string(),
  customerId: z.string().nullable(),
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentMethodTestBlank = {
  id: z.string(),
  createdAt: new Date(2020, 0, 1),
  deletedAt: null,
  userId: null,
  stripeCustomerId: "a-stripe-customer-id",
  stripeSourceId: "a-stripe-source-id",
  lastFourDigits: "1234",
  customerId: "a-customer-id",
};
