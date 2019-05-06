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
  id: string;
  merchant_customer_id: string;
  business_name: string;
  business_trade_name: string | null;
  approved: boolean;
  approved_at: string | null;
  approval_pending: boolean;
  approval_pending_at: string | null;
  denied: boolean;
  denied_at: string | null;
  amount_approved: number;
  amount_authorized: number;
  amount_balance: number;
  amount_available: number;
  last_charged_at: Date | null;
}

export interface ResolveAccountRow {
  created_at: string;
  deleted_at: string | null;
  id: string;
  resolve_customer_id: string;
  user_id: string;
}

export const dataAdapter = new DataAdapter<ResolveAccountRow, ResolveAccount>();

export function isResolveAccountRequest(row: object): row is ResolveAccountRequest {
  return hasProperties(
    row,
    'resolveCustomerId',
    'userId'
  );
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

export function isRawResolveData(row: object): row is RawResolveData {
  return hasProperties(
    row,
    'id',
    'merchant_customer_id',
    'business_name',
    'business_trade_name',
    'approved',
    'approved_at',
    'approval_pending',
    'approval_pending_at',
    'denied',
    'denied_at',
    'amount_approved',
    'amount_authorized',
    'amount_balance',
    'amount_available',
    'last_charged_at'
  );
}
