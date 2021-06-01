import { PricingQuote } from "../../domain-objects/pricing-quote";

export type UnsavedQuote = Omit<
  PricingQuote,
  "id" | "createdAt" | "pricingQuoteInputId" | "processes"
>;

export interface CreateQuotePayload {
  designId: string;
  units: number;
}
