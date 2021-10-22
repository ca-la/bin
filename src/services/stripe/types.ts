import * as z from "zod";

export const chargeSchema = z
  .object({
    id: z.string(),
  })
  .passthrough();

export type Charge = z.infer<typeof chargeSchema>;

export const transferSchema = z
  .object({
    id: z.string(),
  })
  .passthrough();

export type Transfer = z.infer<typeof transferSchema>;

export const customerSchema = z
  .object({
    id: z.string(),
  })
  .passthrough();

export type Customer = z.infer<typeof customerSchema>;

export const connectAccountSchema = z
  .object({
    access_token: z.string(),
    refresh_token: z.string(),
    stripe_publishable_key: z.string(),
    stripe_user_id: z.string(),
  })
  .passthrough();

export type ConnectAccount = z.infer<typeof connectAccountSchema>;

export const loginLinkSchema = z.object({
  url: z.string(),
});

export type LoginLink = z.infer<typeof loginLinkSchema>;

export const sourceTypesSchema = z
  .object({
    bank_account: z.number().optional(),
    card: z.number().optional(),
    fpx: z.number().optional(),
  })
  .passthrough();

export type SourceTypes = z.infer<typeof sourceTypesSchema>;

export const balanceSchema = z.object({
  available: z
    .array(
      z.object({
        amount: z.number(),
        currency: z.enum(["usd"]),
        source_types: sourceTypesSchema,
      })
    )
    .nonempty(),
});

export type Balance = z.infer<typeof balanceSchema>;

export const subscriptionItemSchema = z
  .object({
    id: z.string(),
    quantity: z.number(),
    price: z
      .object({
        id: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export type SubscriptionItem = z.infer<typeof subscriptionItemSchema>;

export const subscriptionSchema = z
  .object({
    id: z.string(),
    latest_invoice: z.string().nullable(),
    customer: z.string(),
    current_period_start: z.number(),
    status: z.enum([
      "active",
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "trialing",
    ]),
    items: z.object({
      object: z.literal("list"),
      data: z.array(subscriptionItemSchema),
    }),
  })
  .passthrough();

export type Subscription = z.infer<typeof subscriptionSchema>;

export const invoiceSchema = z
  .object({
    id: z.string(),
    total: z.number().int().nonnegative(),
    created: z.number().int().positive(),
    subscription: z.string().nullable(),
  })
  .passthrough();
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoicesSchema = z
  .object({
    object: z.literal("list"),
    data: z.array(invoiceSchema),
    has_more: z.boolean(),
  })
  .passthrough();

export const prorationBehaviourSchema = z.enum([
  "create_prorations",
  "none",
  "always_invoice",
]);

export type ProrationBehaviour = z.infer<typeof prorationBehaviourSchema>;
