import * as z from "zod";
import { check } from "../../services/check";

export const pricingUnitMaterialMultipleSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  version: z.number(),
  minimumUnits: z.number(),
  multiple: z.number(),
});
export type PricingUnitMaterialMultiple = z.infer<
  typeof pricingUnitMaterialMultipleSchema
>;

export const pricingUnitMaterialMultipleRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  version: z.number(),
  minimum_units: z.number(),
  multiple: z.number(),
});

export type PricingUnitMaterialMultipleRow = z.infer<
  typeof pricingUnitMaterialMultipleRowSchema
>;

export const pricingUnitMaterialMultipleCreationPayloadSchema = z.object({
  minimum_units: z.string(),
  multiple: z.string(),
});
export type PricingUnitMaterialMultipleCreationPayload = z.infer<
  typeof pricingUnitMaterialMultipleCreationPayloadSchema
>;

export const isPricingUnitMaterialCreationPayload = (
  candidate: unknown
): candidate is PricingUnitMaterialMultipleCreationPayload =>
  check(pricingUnitMaterialMultipleCreationPayloadSchema, candidate);
