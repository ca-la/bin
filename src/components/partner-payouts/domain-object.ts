import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "@cala/ts-lib";

export interface PartnerPayoutLogDb {
  id: string;
  createdAt: Date;
  invoiceId: string | null;
  payoutAccountId: string | null;
  payoutAmountCents: number;
  message: string;
  initiatorUserId: string;
  shortId: string | null;
  bidId: string | null;
  isManual: boolean;
}

export interface PartnerPayoutLogDbRow {
  id: string;
  created_at: string;
  invoice_id: string | null;
  payout_account_id: string | null;
  payout_amount_cents: number;
  message: string;
  initiator_user_id: string;
  short_id: string | null;
  bid_id: string | null;
  is_manual: string;
}

export function toDataDb(row: PartnerPayoutLogDbRow): PartnerPayoutLogDb {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    invoiceId: row.invoice_id,
    payoutAccountId: row.payout_account_id,
    payoutAmountCents: row.payout_amount_cents,
    message: row.message,
    initiatorUserId: row.initiator_user_id,
    shortId: row.short_id,
    bidId: row.bid_id,
    isManual: Boolean(row.is_manual),
  };
}

export function toInsertionDb(
  data: PartnerPayoutLogDb | PartnerPayoutLog
): PartnerPayoutLogDbRow {
  return {
    id: data.id,
    created_at: data.createdAt.toISOString(),
    invoice_id: data.invoiceId,
    payout_account_id: data.payoutAccountId,
    payout_amount_cents: data.payoutAmountCents,
    message: data.message,
    initiator_user_id: data.initiatorUserId,
    short_id: data.shortId,
    bid_id: data.bidId,
    is_manual: data.isManual.toString(),
  };
}

export const dataAdapterDb = new DataAdapter<
  PartnerPayoutLogDbRow,
  PartnerPayoutLogDb
>(toDataDb, toInsertionDb);

export function isPartnerPayoutLogDbRow(
  row: any
): row is PartnerPayoutLogDbRow {
  return hasProperties(
    row,
    "id",
    "created_at",
    "invoice_id",
    "payout_account_id",
    "payout_amount_cents",
    "message",
    "initiator_user_id",
    "short_id",
    "bid_id",
    "is_manual"
  );
}

export interface PartnerPayoutLogRow extends PartnerPayoutLogDbRow {
  payout_account_user_id: string | null;
  collection_title: string | null;
  collection_id: string | null;
}

export interface PartnerPayoutLog extends PartnerPayoutLogDb {
  payoutAccountUserId: string | null;
  collectionTitle: string | null;
  collectionId: string | null;
}

export function toData(row: PartnerPayoutLogRow): PartnerPayoutLog {
  const {
    collection_title,
    collection_id,
    payout_account_user_id,
    ...baseRow
  } = row;
  return {
    collectionId: collection_id,
    collectionTitle: collection_title,
    payoutAccountUserId: payout_account_user_id,
    ...toDataDb(baseRow),
  };
}

export const dataAdapter = new DataAdapter<
  PartnerPayoutLogRow,
  PartnerPayoutLog
>(toData);

export function isPartnerPayoutLogRow(row: any): row is PartnerPayoutLogRow {
  return hasProperties(
    row,
    "id",
    "created_at",
    "invoice_id",
    "payout_account_id",
    "payout_account_user_id",
    "payout_amount_cents",
    "message",
    "initiator_user_id",
    "short_id",
    "collection_title",
    "collection_id"
  );
}
