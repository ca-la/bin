import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

export interface ShopifyVariant {
  id: string;
  shopifyId: string;
  shopifyProductId: string;
  variantId: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface ShopifyVariantRow {
  id: string;
  shopify_id: string;
  shopify_product_id: string;
  variant_id: string;
  created_at: string;
  deleted_at: string | null;
}

export const dataAdapter = new DataAdapter<ShopifyVariantRow, ShopifyVariant>();

export function isShopifyVariantRow(
  candidate: any
): candidate is ShopifyVariantRow {
  return hasProperties(
    candidate,
    "id",
    "shopify_product_id",
    "variant_id",
    "created_at",
    "deleted_at"
  );
}
