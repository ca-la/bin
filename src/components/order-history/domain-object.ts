import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';

export interface OrderHistoryRow {
  invoice_id: string;
  line_item_id: string;
  design_id: string;
  design_title: string | null;
  design_collections: { id: string; title: string | null }[];
  design_image_ids: string[];
  created_at: string;
  total_cost_cents: number;
  units: number;
  base_unit_cost_cents: number;
}

export interface OrderHistory {
  invoiceId: string;
  lineItemId: string;
  designId: string;
  designTitle: string | null;
  designCollections: { id: string; title: string | null }[];
  designImageIds: string[];
  createdAt: Date;
  totalCostCents: number;
  units: number;
  baseUnitCostCents: number;
}

export const orderHistoryDataAdapter = new DataAdapter<
  OrderHistoryRow,
  OrderHistory
>();

export function isOrderHistoryRow(row: any): row is OrderHistoryRow {
  return hasProperties(
    row,
    'invoice_id',
    'line_item_id',
    'design_id',
    'design_title',
    'design_collections',
    'design_image_ids',
    'created_at',
    'total_cost_cents',
    'units',
    'base_unit_cost_cents'
  );
}
