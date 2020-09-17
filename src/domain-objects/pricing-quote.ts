import { Complexity, MaterialCategory, Process, ProductType } from "./pricing";
import PricingConstant from "./pricing-constant";
import PricingProductMaterial from "./pricing-product-material";
import PricingProductType from "../components/pricing-product-types/domain-object";
import PricingProcess from "./pricing-process";
import { hasProperties } from "../services/require-properties";
import DataAdapter from "../services/data-adapter";
import PricingMargin from "./pricing-margin";
import PricingCareLabel from "./pricing-care-label";
import PricingProcessTimeline from "../components/pricing-process-timeline/domain-object";

export interface BasePricingQuoteRequest {
  productType: ProductType;
  productComplexity: Complexity;
  materialCategory: MaterialCategory;
  materialBudgetCents: number;
  units: number;
  designId: string | null;
}

export interface PricingQuoteRequest extends BasePricingQuoteRequest {
  processes: Process[];
}

export interface PricingQuoteRequestWithVersions extends PricingQuoteRequest {
  processesVersion: number;
  productTypeVersion: number;
  constantsVersion: number;
  marginVersion: number;
  productMaterialsVersion: number;
  careLabelsVersion: number;
  processTimelinesVersion: number;
}

export interface PricingQuoteCalculated {
  baseCostCents: number;
  materialCostCents: number;
  processCostCents: number;
  unitCostCents: number;
  creationTimeMs: number | null;
  specificationTimeMs: number | null;
  sourcingTimeMs: number | null;
  samplingTimeMs: number | null;
  preProductionTimeMs: number | null;
  processTimeMs: number | null;
  productionTimeMs: number | null;
  fulfillmentTimeMs: number | null;
}

export interface PricingQuote
  extends BasePricingQuoteRequest,
    PricingQuoteCalculated {
  id: string;
  pricingQuoteInputId: string;
  createdAt: Date;
  processes: PricingProcess[];
}

export interface PricingQuoteRow {
  id: string;
  pricing_quote_input_id: string;
  created_at: Date;
  product_type: ProductType;
  product_complexity: Complexity;
  material_category: MaterialCategory;
  material_budget_cents: number;
  units: number;
  base_cost_cents: number;
  material_cost_cents: number;
  process_cost_cents: number;
  unit_cost_cents: number;
  design_id: string | null;
  creation_time_ms: number | null;
  specification_time_ms: number | null;
  sourcing_time_ms: number | null;
  sampling_time_ms: number | null;
  pre_production_time_ms: number | null;
  production_time_ms: number | null;
  process_time_ms: number | null;
  fulfillment_time_ms: number | null;
}

export interface PricingProcessQuoteRow {
  id: string;
  pricing_quote_id: string;
  pricing_process_id: string;
  created_at: Date;
}

export interface PricingQuoteInputRow {
  id: string;
  constant_id: string;
  margin_id: string;
  product_material_id: string;
  product_type_id: string;
  pricing_process_timeline_id: string | null;
  care_label_id: string;
  created_at: Date;
}

export interface PricingQuoteValues
  extends Omit<PricingConstant, "id" | "createdAt" | "version"> {
  constantId: string;
  material: PricingProductMaterial;
  type: PricingProductType;
  sample: PricingProductType;
  processes: PricingProcess[];
  processTimeline: PricingProcessTimeline | null;
  margin: PricingMargin;
  careLabel: PricingCareLabel;
}

export const dataAdapter = new DataAdapter<PricingQuoteRow, PricingQuote>();

export function isPricingQuoteRequest(
  candidate: object
): candidate is PricingQuoteRequest {
  return hasProperties(
    candidate,
    "productType",
    "productComplexity",
    "materialCategory",
    "materialBudgetCents",
    "processes",
    "units",
    "designId"
  );
}

export function isPricingQuote(candidate: object): candidate is PricingQuote {
  return hasProperties(
    candidate,
    "id",
    "pricingQuoteInputId",
    "createdAt",
    "productType",
    "productComplexity",
    "materialCategory",
    "materialBudgetCents",
    "processes",
    "units",
    "baseCostCents",
    "materialCostCents",
    "processCostCents",
    "unitCostCents",
    "designId",
    "creationTimeMs",
    "specificationTimeMs",
    "sourcingTimeMs",
    "samplingTimeMs",
    "pre_productionTimeMs",
    "productionTimeMs",
    "fulfillmentTimeMs"
  );
}

export function isPricingQuoteRow(
  candidate: object
): candidate is PricingQuoteRow {
  return hasProperties(
    candidate,
    "id",
    "pricing_quote_input_id",
    "created_at",
    "product_type",
    "product_complexity",
    "material_category",
    "material_budget_cents",
    "units",
    "base_cost_cents",
    "material_cost_cents",
    "process_cost_cents",
    "unit_cost_cents",
    "design_id",
    "creation_time_ms",
    "specification_time_ms",
    "sourcing_time_ms",
    "sampling_time_ms",
    "pre_production_time_ms",
    "production_time_ms",
    "fulfillment_time_ms"
  );
}
