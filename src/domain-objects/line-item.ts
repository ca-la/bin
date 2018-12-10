import DataAdapter from '../services/data-adapter';
import { hasOnlyProperties } from '../services/require-properties';

export default interface LineItem {
  id: string;
  createdAt: Date;
  title: string;
  description: string;
  designId: string | null;
  quoteId: string | null;
  invoiceId: string;
}

export interface LineItemRow {
  id: string;
  created_at: Date;
  title: string;
  description: string;
  design_id: string;
  quote_id: string;
  invoice_id: string;
}

export const dataAdapter = new DataAdapter<LineItemRow, LineItem>();

export function isLineItem(candidate: object): candidate is LineItem {
  return hasOnlyProperties(
    candidate,
    'id',
    'createdAt',
    'title',
    'description',
    'designId',
    'quoteId',
    'invoiceId'
  );
}

export function isLineItemRow(row: object): row is LineItemRow {
  return hasOnlyProperties(
    row,
    'id',
    'created_at',
    'title',
    'description',
    'design_id',
    'quote_id',
    'invoice_id'
  );
}
