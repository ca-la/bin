import { z } from "zod";

export const designQuoteSchema = z.object({
  designId: z.string(),
  payLaterTotalCents: z.number(),
  payNowTotalCents: z.number(),
  timeTotalMs: z.number(),
  units: z.number(),
  minimumOrderQuantity: z.number(),
});
export type DesignQuote = z.infer<typeof designQuoteSchema>;
