import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface ShopifyProduct {
  id: string;
  shopifyId: string;
  designId: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface ShopifyProductRow {
  id: string;
  shopify_id: string;
  design_id: string;
  created_at: string;
  deleted_at: string | null;
}

export const dataAdapter = new DataAdapter<ShopifyProductRow, ShopifyProduct>();

export function isShopifyProductRow(
  candidate: any
): candidate is ShopifyProductRow {
  return hasProperties(
    candidate,
    'id',
    'shopify_id',
    'design_id',
    'created_at',
    'deleted_at'
  );
}
