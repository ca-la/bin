import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '@cala/ts-lib';

export interface PartnerPayoutLog {
  id: string;
  createdAt: Date;
  invoiceId: string;
  payoutAccountId: string;
  payoutAmountCents: number;
  message: string;
  initiatorUserId: string;
}

export interface PartnerPayoutLogRow {
  id: string;
  created_at: string;
  invoice_id: string;
  payout_account_id: string;
  payout_amount_cents: number;
  message: string;
  initiator_user_id: string;
}

export function toData(row: PartnerPayoutLogRow): PartnerPayoutLog {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    invoiceId: row.invoice_id,
    payoutAccountId: row.payout_account_id,
    payoutAmountCents: row.payout_amount_cents,
    message: row.message,
    initiatorUserId: row.initiator_user_id
  };
}

export function toInsertion(data: PartnerPayoutLog): PartnerPayoutLogRow {
  return {
    id: data.id,
    created_at: data.createdAt.toISOString(),
    invoice_id: data.invoiceId,
    payout_account_id: data.payoutAccountId,
    payout_amount_cents: data.payoutAmountCents,
    message: data.message,
    initiator_user_id: data.initiatorUserId
  };
}

export const dataAdapter = new DataAdapter<
  PartnerPayoutLogRow,
  PartnerPayoutLog
>(toData, toInsertion);

export function isPartnerPayoutLogRow(row: any): row is PartnerPayoutLogRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'invoice_id',
    'payout_account_id',
    'payout_amount_cents',
    'message',
    'initiator_user_id'
  );
}
