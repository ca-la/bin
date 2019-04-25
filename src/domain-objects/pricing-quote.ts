import {
  Complexity,
  MaterialCategory,
  Process,
  ProductType
} from './pricing';
import PricingConstant from './pricing-constant';
import PricingProductMaterial from './pricing-product-material';
import PricingProductType from './pricing-product-type';
import PricingProcess from './pricing-process';
import { hasProperties } from '../services/require-properties';
import DataAdapter from '../services/data-adapter';
import PricingMargin from './pricing-margin';
import PricingCareLabel from './pricing-care-label';

interface BasePricingQuoteRequest {
  productType: ProductType;
  productComplexity: Complexity;
  materialCategory: MaterialCategory;
  materialBudgetCents?: number;
  units: number;
  designId: string | null;
}

export interface PricingQuoteRequest extends BasePricingQuoteRequest {
  processes: Process[];
}

export interface PricingQuoteCalculated {
  baseCostCents: number;
  materialCostCents: number;
  processCostCents: number;
  unitCostCents: number;
  creationTimeMs: number;
  specificationTimeMs: number;
  sourcingTimeMs: number;
  samplingTimeMs: number;
  preProductionTimeMs: number;
  productionTimeMs: number;
  fulfillmentTimeMs: number;
}

export interface PricingQuote extends BasePricingQuoteRequest, PricingQuoteCalculated {
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
  material_budget_cents?: number;
  units: number;
  base_cost_cents: number;
  material_cost_cents: number;
  process_cost_cents: number;
  unit_cost_cents: number;
  design_id: string | null;
  creation_time_ms: number;
  specification_time_ms: number;
  sourcing_time_ms: number;
  sampling_time_ms: number;
  pre_production_time_ms: number;
  production_time_ms: number;
  fulfillment_time_ms: number;
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
  care_label_id: string;
  created_at: Date;
}

export interface PricingQuoteValues extends Omit<PricingConstant, 'id' | 'createdAt' | 'version'> {
  constantId: string;
  material: PricingProductMaterial;
  type: PricingProductType;
  sample: PricingProductType;
  processes: PricingProcess[];
  margin: PricingMargin;
  careLabel: PricingCareLabel;
}

export const dataAdapter = new DataAdapter<PricingQuoteRow, PricingQuote>();

export function isPricingQuoteRequest(candidate: object): candidate is PricingQuoteRequest {
  return hasProperties(
    candidate,
    'productType',
    'productComplexity',
    'materialCategory',
    'materialBudgetCents',
    'processes',
    'units',
    'designId'
  );
}

export function isPricingQuote(candidate: object): candidate is PricingQuote {
  return hasProperties(
    candidate,
    'id',
    'pricingQuoteInputId',
    'createdAt',
    'productType',
    'productComplexity',
    'materialCategory',
    'materialBudgetCents',
    'processes',
    'units',
    'baseCostCents',
    'materialCostCents',
    'processCostCents',
    'unitCostCents',
    'designId',
    'creationTimeMs',
    'specificationTimeMs',
    'sourcingTimeMs',
    'samplingTimeMs',
    'pre_productionTimeMs',
    'productionTimeMs',
    'fulfillmentTimeMs'
  );
}

export function isPricingQuoteRow(candidate: object): candidate is PricingQuoteRow {
  return hasProperties(
    candidate,
    'id',
    'pricing_quote_input_id',
    'created_at',
    'product_type',
    'product_complexity',
    'material_category',
    'material_budget_cents',
    'units',
    'base_cost_cents',
    'material_cost_cents',
    'process_cost_cents',
    'unit_cost_cents',
    'design_id',
    'creation_time_ms',
    'specification_time_ms',
    'sourcing_time_ms',
    'sampling_time_ms',
    'pre_production_time_ms',
    'production_time_ms',
    'fulfillment_time_ms'
  );
}
