import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';

export interface OrderHistoryRow {
  invoice_id: string;
  line_item_id: string;
  design_id: string;
  design_title: string | null;
  design_collections: { id: string; title: string | null }[];
  design_image_ids: string[] | null;
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

export function toData(row: OrderHistoryRow): OrderHistory {
  return {
    invoiceId: row.invoice_id,
    lineItemId: row.line_item_id,
    designId: row.design_id,
    designTitle: row.design_title,
    designCollections: row.design_collections,
    designImageIds: row.design_image_ids || [],
    createdAt: new Date(row.created_at),
    totalCostCents: row.total_cost_cents,
    units: row.units,
    baseUnitCostCents: row.base_unit_cost_cents
  };
}

export function toInsertion(data: OrderHistory): OrderHistoryRow {
  return {
    invoice_id: data.invoiceId,
    line_item_id: data.lineItemId,
    design_id: data.designId,
    design_title: data.designTitle,
    design_collections: data.designCollections,
    design_image_ids: data.designImageIds,
    created_at: data.createdAt.toISOString(),
    total_cost_cents: data.totalCostCents,
    units: data.units,
    base_unit_cost_cents: data.baseUnitCostCents
  };
}

export const orderHistoryDataAdapter = new DataAdapter<
  OrderHistoryRow,
  OrderHistory
>(toData, toInsertion);

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
