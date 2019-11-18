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
  baseUrl: string | null;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
}

export interface StorefrontTokenRow {
  id: string;
  provider_name: string;
  storefront_id: string;
  token: string;
  base_url: string | null;
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
    'base_url',
    'created_at',
    'created_by',
    'deleted_at'
  );
}
