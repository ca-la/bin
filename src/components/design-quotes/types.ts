import { z } from "zod";

export const designQuoteLineItemSchema = z.object({
  description: z.string(),
  explainerCopy: z.string().nullable(),
  cents: z.number(),
});
export type DesignQuoteLineItem = z.infer<typeof designQuoteLineItemSchema>;

export const designQuoteSchema = z.object({
  designId: z.string(),
  payLaterTotalCents: z.number(),
  payNowTotalCents: z.number(),
  timeTotalMs: z.number(),
  units: z.number(),
  minimumOrderQuantity: z.number(),
  lineItems: z.array(designQuoteLineItemSchema),
});
export type DesignQuote = z.infer<typeof designQuoteSchema>;

export const financingItemSchema = z.object({
  accountId: z.string(),
  financedAmountCents: z.number(),
  feeAmountCents: z.number(),
  termLengthDays: z.number(),
});
export type FinancingItem = z.infer<typeof financingItemSchema>;

export const cartDetailsSchema = z.object({
  quotes: z.array(designQuoteSchema),
  combinedLineItems: z.array(designQuoteLineItemSchema),
  subtotalCents: z.number(),
  dueNowCents: z.number(),
  dueLaterCents: z.number(),
  creditAppliedCents: z.number(),
  balanceDueCents: z.number(),
  totalUnits: z.number(),
  financingItems: z.array(financingItemSchema),
});
export type CartDetails = z.infer<typeof cartDetailsSchema>;

export const cartSubtotalSchema = cartDetailsSchema
  .pick({
    quotes: true,
    subtotalCents: true,
    combinedLineItems: true,
    totalUnits: true,
  })
  .extend({
    teamTotalsMap: z.record(z.number()),
  });

export type CartSubtotal = z.infer<typeof cartSubtotalSchema>;
