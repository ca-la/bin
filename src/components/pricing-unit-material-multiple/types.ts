import * as z from "zod";
import { check } from "../../services/check";
import { hasProperties } from "../../services/require-properties";

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

export const isPricingUnitMaterialRow = (
  candidate: unknown
): candidate is PricingUnitMaterialMultipleRow =>
  hasProperties(
    candidate,
    "id",
    "created_at",
    "version",
    "minimum_units",
    "multiple"
  );
