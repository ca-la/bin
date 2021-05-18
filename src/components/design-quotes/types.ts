import { z } from "zod";

export const designQuoteLineItemSchema = z.object({
  description: z.string(),
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
