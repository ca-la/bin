import DataAdapter from '../../../services/data-adapter';
import { hasProperties } from '../../../services/require-properties';

export enum ProviderName {
  SHOPIFY = 'shopify'
}

export default interface StorefrontToken {
  id: string;
  providerName: ProviderName;
  storefrontId: string;
  token: string;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
}

export interface StorefrontTokenRow {
  id: string;
  provider_name: string;
  storefront_id: string;
  token: string;
  created_at: Date;
  created_by: string;
  deleted_at: Date | null;
}

export const dataAdapter = new DataAdapter<
  StorefrontTokenRow,
  StorefrontToken
>();
export const unsavedDataAdapter = new DataAdapter<
  Unsaved<StorefrontTokenRow>,
  Unsaved<StorefrontToken>
>();

export function isStorefrontTokenRow(
  candidate: any
): candidate is StorefrontTokenRow {
  return hasProperties(
    candidate,
    'id',
    'provider_name',
    'storefront_id',
    'token',
    'created_at',
    'created_by',
    'deleted_at'
  );
}
