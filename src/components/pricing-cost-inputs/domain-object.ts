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
  expires_at: Date | null;
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

function encodeBase(row: BasePricingCostInputRow): BasePricingCostInput {
  return {
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    designId: row.design_id,
    expiresAt: row.expires_at,
    id: row.id,
    materialBudgetCents: row.material_budget_cents,
    materialCategory: row.material_category,
    productComplexity: row.product_complexity,
    productType: row.product_type,
  };
}

function decodeBase(data: BasePricingCostInput): BasePricingCostInputRow {
  return {
    created_at: data.createdAt,
    deleted_at: data.deletedAt,
    design_id: data.designId,
    expires_at: data.expiresAt,
    id: data.id,
    material_budget_cents: data.materialBudgetCents,
    material_category: data.materialCategory,
    product_complexity: data.productComplexity,
    product_type: data.productType,
  };
}

function encodeWithoutVersions(
  row: PricingCostInputRowWithoutVersions
): PricingCostInputWithoutVersions {
  return {
    ...encodeBase(row),
    processes: row.processes,
  };
}

function decodeWithoutVersions(
  data: PricingCostInputWithoutVersions
): PricingCostInputRowWithoutVersions {
  return {
    ...decodeBase(data),
    processes: data.processes,
  };
}

function encode(row: PricingCostInputRow): PricingCostInput {
  return {
    ...encodeWithoutVersions(row),
    careLabelsVersion: row.care_labels_version,
    constantsVersion: row.constants_version,
    marginVersion: row.margin_version,
    processTimelinesVersion: row.process_timelines_version,
    processesVersion: row.processes_version,
    productMaterialsVersion: row.product_materials_version,
    productTypeVersion: row.product_type_version,
  };
}

function decode(data: PricingCostInput): PricingCostInputRow {
  return {
    ...decodeWithoutVersions(data),
    care_labels_version: data.careLabelsVersion,
    constants_version: data.constantsVersion,
    margin_version: data.marginVersion,
    process_timelines_version: data.processTimelinesVersion,
    processes_version: data.processesVersion,
    product_materials_version: data.productMaterialsVersion,
    product_type_version: data.productTypeVersion,
  };
}

export const dataAdapter = new DataAdapter<
  PricingCostInputRow,
  PricingCostInput
>(encode, decode);

export const dataAdapterWithoutVersions = new DataAdapter<
  PricingCostInputRowWithoutVersions,
  PricingCostInputWithoutVersions
>(encodeWithoutVersions, decodeWithoutVersions);

export const baseDataAdapter = new DataAdapter<
  BasePricingCostInputRow,
  BasePricingCostInput
>(encodeBase, decodeBase);

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
