import { hasProperties } from "../../../services/require-properties";
import DataAdapter from "../../../services/data-adapter";

export interface ProductDesignData {
  id: string;
  createdAt: Date;
  title: string | null;
  productType: string | null;
  metadata: object | null;
  userId: string;
  deletedAt: Date | null;
  description: string | null;
  previewImageUrls: object | null;
  computedPricingTable: object | null;
  overridePricingTable: object | null;
  retailPriceCents: number | null;
  status: string;
  dueDate: Date | null;
  expectedCostCents: number | null;
  showPricingBreakdown: boolean | null;
}

export interface ProductDesignRow {
  id: string;
  created_at: string;
  title: string | null;
  product_type: string | null;
  metadata: object | null;
  user_id: string;
  deleted_at: string | null;
  description: string | null;
  preview_image_urls: object | null;
  computed_pricing_table: object | null;
  override_pricing_table: object | null;
  retail_price_cents: number | null;
  status: string;
  due_date: string | null;
  expected_cost_cents: number | null;
  show_pricing_breakdown: boolean | null;
}

export const dataAdapter = new DataAdapter<ProductDesignRow, ProductDesignData>(
  toData,
  toInsertion
);

export function toInsertion(data: ProductDesignData): ProductDesignRow {
  return {
    id: data.id,
    created_at: data.createdAt.toISOString(),
    title: data.title,
    product_type: data.productType,
    metadata: data.metadata,
    user_id: data.userId,
    deleted_at: data.deletedAt ? data.deletedAt.toISOString() : null,
    description: data.description,
    preview_image_urls: data.previewImageUrls,
    computed_pricing_table: data.computedPricingTable,
    override_pricing_table: data.overridePricingTable,
    retail_price_cents: data.retailPriceCents,
    status: data.status,
    due_date: data.dueDate ? data.dueDate.toISOString() : null,
    expected_cost_cents: data.expectedCostCents,
    show_pricing_breakdown: data.showPricingBreakdown,
  };
}

export function toData(row: ProductDesignRow): ProductDesignData {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    title: row.title,
    productType: row.product_type,
    metadata: row.metadata,
    userId: row.user_id,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    description: row.description,
    previewImageUrls: row.preview_image_urls,
    computedPricingTable: row.computed_pricing_table,
    overridePricingTable: row.override_pricing_table,
    retailPriceCents: row.retail_price_cents,
    status: row.status,
    dueDate: row.due_date ? new Date(row.due_date) : null,
    expectedCostCents: row.expected_cost_cents,
    showPricingBreakdown: row.show_pricing_breakdown,
  };
}

export function isProductDesignRow(row: any): row is ProductDesignRow {
  return hasProperties(
    row,
    "id",
    "created_at",
    "title",
    "product_type",
    "metadata",
    "user_id",
    "deleted_at",
    "description",
    "preview_image_urls",
    "computed_pricing_table",
    "override_pricing_table",
    "retail_price_cents",
    "status",
    "due_date",
    "expected_cost_cents",
    "show_pricing_breakdown"
  );
}
