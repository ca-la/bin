import { z } from "zod";
import {
  Complexity,
  MaterialCategory,
  processSchema,
  ProductType,
} from "../../domain-objects/pricing";

const pricingCostInputDbSchema = z.object({
  careLabelsVersion: z.number(),
  constantsVersion: z.number(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  designId: z.string(),
  expiresAt: z.date().nullable(),
  id: z.string(),
  marginVersion: z.number(),
  materialBudgetCents: z.number(),
  materialCategory: z.nativeEnum(MaterialCategory),
  minimumOrderQuantity: z.number(),
  processTimelinesVersion: z.number(),
  processesVersion: z.number(),
  productComplexity: z.nativeEnum(Complexity),
  productMaterialsVersion: z.number(),
  productType: z.nativeEnum(ProductType),
  productTypeVersion: z.number(),
  unitMaterialMultipleVersion: z.number(),
});

export type PricingCostInputDb = z.infer<typeof pricingCostInputDbSchema>;

const pricingCostInputDbRowSchema = z.object({
  care_labels_version: z.number(),
  constants_version: z.number(),
  created_at: z.date(),
  deleted_at: z.date().nullable(),
  design_id: z.string(),
  expires_at: z.date().nullable(),
  id: z.string(),
  margin_version: z.number(),
  material_budget_cents: z.number(),
  material_category: z.nativeEnum(MaterialCategory),
  minimum_order_quantity: z.number(),
  process_timelines_version: z.number(),
  processes_version: z.number(),
  product_complexity: z.nativeEnum(Complexity),
  product_materials_version: z.number(),
  product_type: z.nativeEnum(ProductType),
  product_type_version: z.number(),
  unit_material_multiple_version: z.number(),
});

export type PricingCostInputDbRow = z.infer<typeof pricingCostInputDbRowSchema>;

const pricingCostInputSchema = pricingCostInputDbSchema.extend({
  processes: processSchema.array(),
});

const pricingCostInputRowSchema = pricingCostInputDbRowSchema.extend({
  processes: processSchema.array(),
});

export type PricingCostInput = z.infer<typeof pricingCostInputSchema>;
export type PricingCostInputRow = z.infer<typeof pricingCostInputRowSchema>;

export const createPricingCostInputRequestSchema = pricingCostInputSchema
  .pick({
    designId: true,
    materialBudgetCents: true,
    materialCategory: true,
    processes: true,
    productComplexity: true,
    productType: true,
    minimumOrderQuantity: true,
  })
  .extend({
    needsTechnicalDesigner: z.boolean().optional(),
    minimumOrderQuantity: z.number().optional(),
  });

export type CreatePricingCostInputRequest = z.infer<
  typeof createPricingCostInputRequestSchema
>;

export function isCreatePricingCostInputRequest(
  candidate: Record<string, any>
): candidate is CreatePricingCostInputRequest {
  const keyset = new Set(Object.keys(candidate));

  return [
    "designId",
    "materialBudgetCents",
    "materialCategory",
    "processes",
    "productComplexity",
    "productType",
  ].every(keyset.has.bind(keyset));
}

export type PricingCostInputWithoutVersions = Omit<
  PricingCostInput,
  | "processesVersion"
  | "productTypeVersion"
  | "constantsVersion"
  | "marginVersion"
  | "productMaterialsVersion"
  | "careLabelsVersion"
  | "processTimelinesVersion"
  | "unitMaterialMultipleVersion"
>;

export type UncomittedCostInput = Omit<
  PricingCostInputWithoutVersions,
  "id" | "createdAt" | "expiresAt" | "deletedAt"
>;
