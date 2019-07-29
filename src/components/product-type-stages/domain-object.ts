import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';

export default interface ProductTypeStage {
  id: string;
  pricingProductTypeId: string;
  stageTemplateId: string;
}

export interface ProductTypeStageRow {
  id: string;
  pricing_product_type_id: string;
  stage_template_id: string;
}

export const dataAdapter = new DataAdapter<
  ProductTypeStageRow,
  ProductTypeStage
>();

export function isProductTypeStageRow(row: any): row is ProductTypeStageRow {
  return hasProperties(
    row,
    'id',
    'pricing_product_type_id',
    'stage_template_id'
  );
}

export function isProductTypeStage(data: any): data is ProductTypeStage {
  return hasProperties(data, 'id', 'pricingProductTypeId', 'stageTemplateId');
}
