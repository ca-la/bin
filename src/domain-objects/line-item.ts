import DataAdapter from "../services/data-adapter";
import {
  hasOnlyProperties,
  hasProperties,
} from "../services/require-properties";

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
    "id",
    "createdAt",
    "title",
    "description",
    "designId",
    "quoteId",
    "invoiceId"
  );
}

export function isLineItemRow(row: object): row is LineItemRow {
  return hasOnlyProperties(
    row,
    "id",
    "created_at",
    "title",
    "description",
    "design_id",
    "quote_id",
    "invoice_id"
  );
}

export interface LineItemWithMeta extends LineItem {
  designTitle: string | null;
  designCollections: { id: string; title: string | null }[] | null;
  designImageIds: string[] | null;
  quotedUnits: number;
  quotedUnitCostCents: number;
}

export interface LineItemWithMetaRow extends LineItemRow {
  design_title: string | null;
  design_collections: { id: string; title: string | null }[] | null;
  design_image_ids: string[] | null;
  quoted_units: number;
  quoted_unit_cost_cents: number;
}

export const dataAdapterMeta = new DataAdapter<
  LineItemWithMetaRow,
  LineItemWithMeta
>();

export function isLineItemWithMeta(
  candidate: object
): candidate is LineItemWithMeta {
  return hasProperties(
    candidate,
    "id",
    "createdAt",
    "title",
    "description",
    "designId",
    "quoteId",
    "invoiceId",
    "designTitle",
    "designCollections",
    "designImageIds",
    "quotedUnits",
    "quotedUnitCostCents"
  );
}

export function isLineItemWithMetaRow(row: object): row is LineItemWithMetaRow {
  return hasProperties(
    row,
    "id",
    "created_at",
    "title",
    "description",
    "design_id",
    "quote_id",
    "invoice_id",
    "design_title",
    "design_collections",
    "design_image_ids",
    "quoted_units",
    "quoted_unit_cost_cents"
  );
}
