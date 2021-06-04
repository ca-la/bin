import { z } from "zod";
import { PricingQuote } from "../../domain-objects/pricing-quote";

export type UnsavedQuote = Omit<
  PricingQuote,
  "id" | "createdAt" | "pricingQuoteInputId" | "processes"
>;

export const createQuotePayloadSchema = z.object({
  designId: z.string(),
  units: z.number(),
});
export type CreateQuotePayload = z.infer<typeof createQuotePayloadSchema>;
