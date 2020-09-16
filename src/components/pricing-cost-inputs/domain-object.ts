import { hasProperties } from "../../services/require-properties";
import DataAdapter from "../../services/data-adapter";
export * from "./types";
import {
  PricingCostInput,
  PricingCostInputDb,
  PricingCostInputDbRow,
  PricingCostInputRow,
} from "./types";

function encodeDb(row: PricingCostInputDbRow): PricingCostInputDb {
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
    careLabelsVersion: row.care_labels_version,
    constantsVersion: row.constants_version,
    marginVersion: row.margin_version,
    processTimelinesVersion: row.process_timelines_version,
    processesVersion: row.processes_version,
    productMaterialsVersion: row.product_materials_version,
    productTypeVersion: row.product_type_version,
    minimumOrderQuantity: row.minimum_order_quantity,
  };
}

function decodeDb(data: PricingCostInputDb): PricingCostInputDbRow {
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
    care_labels_version: data.careLabelsVersion,
    constants_version: data.constantsVersion,
    margin_version: data.marginVersion,
    process_timelines_version: data.processTimelinesVersion,
    processes_version: data.processesVersion,
    product_materials_version: data.productMaterialsVersion,
    product_type_version: data.productTypeVersion,
    minimum_order_quantity: data.minimumOrderQuantity,
  };
}

function encode(row: PricingCostInputRow): PricingCostInput {
  return {
    ...encodeDb(row),
    processes: row.processes,
  };
}

function decode(data: PricingCostInput): PricingCostInputRow {
  return {
    ...decodeDb(data),
    processes: data.processes,
  };
}

export const dataAdapter = new DataAdapter<
  PricingCostInputRow,
  PricingCostInput
>(encode, decode);

export const dbDataAdapter = new DataAdapter<
  PricingCostInputDbRow,
  PricingCostInputDb
>(encodeDb, decodeDb);

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
    "product_type_version",
    "minimum_order_quantity"
  );
}

export default PricingCostInput;
