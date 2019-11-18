import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export default interface Storefront {
  id: string;
  name: string;
  createdAt: Date;
  deletedAt: Date | null;
  createdBy: string;
}

export interface StorefrontRow {
  id: string;
  name: string;
  created_at: Date;
  deleted_at: Date | null;
  created_by: string;
}

export const dataAdapter = new DataAdapter<StorefrontRow, Storefront>();
export const unsavedDataAdapter = new DataAdapter<
  Unsaved<StorefrontRow>,
  Unsaved<Storefront>
>();

export function isStorefrontRow(candidate: any): candidate is StorefrontRow {
  return hasProperties(
    candidate,
    'id',
    'name',
    'created_at',
    'deleted_at',
    'created_by'
  );
}
