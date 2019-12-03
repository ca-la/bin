import { isPlainObject } from 'lodash';
import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export interface ResolveAccountRequest {
  resolveCustomerId: string;
  userId: string;
}

export default interface ResolveAccount extends ResolveAccountRequest {
  createdAt: Date;
  deletedAt: Date | null;
  id: string;
}

export interface RawResolveData {
  approved_at: string | null;
  amount_available: number;
  amount_balance: number;
  business_name: string;
  approved: boolean;
  amount_approved: number;
}

export interface ResolveAccountRow {
  created_at: string;
  deleted_at: string | null;
  id: string;
  resolve_customer_id: string;
  user_id: string;
}

export const dataAdapter = new DataAdapter<ResolveAccountRow, ResolveAccount>();

export function isResolveAccountRequest(
  row: object
): row is ResolveAccountRequest {
  return hasProperties(row, 'resolveCustomerId', 'userId');
}

export function isResolveAccountRow(row: object): row is ResolveAccountRow {
  return hasProperties(
    row,
    'created_at',
    'deleted_at',
    'id',
    'resolve_customer_id',
    'user_id'
  );
}

export function isRawResolveData(row: any): row is RawResolveData {
  return (
    isPlainObject(row) &&
    hasProperties(
      row,
      'approved_at',
      'amount_available',
      'amount_balance',
      'business_name',
      'approved',
      'amount_approved'
    )
  );
}
