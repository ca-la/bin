import {
  Complexity,
  MaterialCategory,
  Process,
  ProductType,
} from "../../domain-objects/pricing";

export interface PricingCostInputDb {
  careLabelsVersion: number;
  constantsVersion: number;
  createdAt: Date;
  deletedAt: Date | null;
  designId: string;
  expiresAt: Date | null;
  id: string;
  marginVersion: number;
  materialBudgetCents: number;
  materialCategory: MaterialCategory;
  minimumOrderQuantity: number;
  processTimelinesVersion: number;
  processesVersion: number;
  productComplexity: Complexity;
  productMaterialsVersion: number;
  productType: ProductType;
  productTypeVersion: number;
  unitMaterialMultipleVersion: number;
}

export interface PricingCostInputDbRow {
  care_labels_version: number;
  constants_version: number;
  created_at: Date;
  deleted_at: Date | null;
  design_id: string;
  expires_at: Date | null;
  id: string;
  margin_version: number;
  material_budget_cents: number;
  material_category: MaterialCategory;
  minimum_order_quantity: number;
  process_timelines_version: number;
  processes_version: number;
  product_complexity: Complexity;
  product_materials_version: number;
  product_type: ProductType;
  product_type_version: number;
  unit_material_multiple_version: number;
}

export interface PricingCostInput extends PricingCostInputDb {
  processes: Process[];
}

export interface PricingCostInputRow extends PricingCostInputDbRow {
  processes: Process[];
}

export interface CreatePricingCostInputRequest {
  designId: PricingCostInput["designId"];
  materialBudgetCents: PricingCostInput["materialBudgetCents"];
  materialCategory: PricingCostInput["materialCategory"];
  processes: PricingCostInput["processes"];
  productComplexity: PricingCostInput["productComplexity"];
  productType: PricingCostInput["productType"];

  needsTechnicalDesigner?: boolean;
  minimumOrderQuantity?: PricingCostInput["minimumOrderQuantity"];
}

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
