import DataAdapter from "../../../services/data-adapter";
import { hasProperties } from "../../../services/require-properties";

export default interface StorefrontUser {
  storefrontId: string;
  userId: string;
}

export interface StorefrontUserRow {
  storefront_id: string;
  user_id: string;
}

export const dataAdapter = new DataAdapter<StorefrontUserRow, StorefrontUser>();

export function isStorefrontUserRow(
  candidate: any
): candidate is StorefrontUserRow {
  return hasProperties(candidate, "storefront_id", "user_id");
}
