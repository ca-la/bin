import {
  Complexity,
  MaterialCategory,
  Process,
  ProductType,
} from "../../domain-objects/pricing";
import { hasProperties } from "../../services/require-properties";
import DataAdapter from "../../services/data-adapter";

export interface BasePricingCostInput {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
  designId: string;
  expiresAt: Date | null;
  productType: ProductType;
  productComplexity: Complexity;
  materialCategory: MaterialCategory;
  materialBudgetCents?: number;
}

export interface PricingCostInputWithoutVersions extends BasePricingCostInput {
  processes: Process[];
  needsTechnicalDesigner?: boolean;
}

export default interface PricingCostInput
  extends PricingCostInputWithoutVersions {
  processesVersion: number;
  productTypeVersion: number;
  constantsVersion: number;
  marginVersion: number;
  productMaterialsVersion: number;
  careLabelsVersion: number;
  processTimelinesVersion: number;
}

export interface BasePricingCostInputRow {
  id: string;
  created_at: Date;
  deleted_at: Date | null;
  design_id: string;
  expires_at: string | null;
  product_type: ProductType;
  product_complexity: Complexity;
  material_category: MaterialCategory;
  material_budget_cents?: number;
}

export interface PricingCostInputRowWithoutVersions
  extends BasePricingCostInputRow {
  processes: Process[];
}

export interface PricingCostInputRow
  extends PricingCostInputRowWithoutVersions {
  processes_version: number;
  constants_version: number;
  margin_version: number;
  product_materials_version: number;
  care_labels_version: number;
  process_timelines_version: number;
  product_type_version: number;
}

export const dataAdapter = new DataAdapter<
  PricingCostInputRow,
  PricingCostInput
>();

export const dataAdapterWithoutVersions = new DataAdapter<
  PricingCostInputRowWithoutVersions,
  PricingCostInputWithoutVersions
>();

export const baseDataAdapter = new DataAdapter<
  BasePricingCostInputRow,
  BasePricingCostInput
>();

export function isUnsavedPricingCostInput(
  candidate: object
): candidate is Unsaved<PricingCostInputWithoutVersions> {
  return hasProperties(
    candidate,
    "productType",
    "productComplexity",
    "materialCategory",
    "materialBudgetCents",
    "processes",
    "designId"
  );
}

export function isPricingCostInput(
  candidate: object
): candidate is PricingCostInput {
  return hasProperties(
    candidate,
    "id",
    "createdAt",
    "deletedAt",
    "expiresAt",
    "productType",
    "productComplexity",
    "materialCategory",
    "materialBudgetCents",
    "processes",
    "designId",
    "processesVersion",
    "productTypeVersion",
    "constantsVersion",
    "marginVersion",
    "productMaterialsVersion",
    "careLabelsVersion",
    "processTimelinesVersion"
  );
}

export function isPricingCostInputRow(
  candidate: object
): candidate is PricingCostInputRow {
  return hasProperties(
    candidate,
    "id",
    "created_at",
    "deleted_at",
    "expires_at",
    "product_type",
    "product_complexity",
    "material_category",
    "material_budget_cents",
    "processes",
    "design_id",
    "processes_version",
    "constants_version",
    "margin_version",
    "product_materials_version",
    "care_labels_version",
    "process_timelines_version",
    "product_type_version"
  );
}
