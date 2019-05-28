import { Complexity, MaterialCategory, Process, ProductType } from './pricing';
import { hasProperties } from '../services/require-properties';
import DataAdapter from '../services/data-adapter';

export default interface PricingCostInput {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
  designId: string;
  productType: ProductType;
  productComplexity: Complexity;
  materialCategory: MaterialCategory;
  materialBudgetCents?: number;
  processes: Process[];
}

export interface PricingCostInputRow {
  id: string;
  created_at: Date;
  deleted_at: Date | null;
  design_id: string;
  product_type: ProductType;
  product_complexity: Complexity;
  material_category: MaterialCategory;
  material_budget_cents?: number;
  processes: Process[];
}

export const dataAdapter = new DataAdapter<
  PricingCostInputRow,
  PricingCostInput
>();

export function isUnsavedPricingCostInput(
  candidate: object
): candidate is Unsaved<PricingCostInput> {
  return hasProperties(
    candidate,
    'productType',
    'productComplexity',
    'materialCategory',
    'materialBudgetCents',
    'processes',
    'designId'
  );
}

export function isPricingCostInput(
  candidate: object
): candidate is PricingCostInput {
  return hasProperties(
    candidate,
    'id',
    'createdAt',
    'deletedAt',
    'productType',
    'productComplexity',
    'materialCategory',
    'materialBudgetCents',
    'processes',
    'designId'
  );
}

export function isPricingCostInputRow(
  candidate: object
): candidate is PricingCostInputRow {
  return hasProperties(
    candidate,
    'id',
    'created_at',
    'deleted_at',
    'product_type',
    'product_complexity',
    'material_category',
    'material_budget_cents',
    'processes',
    'design_id'
  );
}
