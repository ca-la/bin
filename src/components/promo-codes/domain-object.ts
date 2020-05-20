import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

export interface PromoCodeRow {
  code: string;
  code_expires_at: string | null;
  created_at: string;
  created_by: string;
  credit_amount_cents: string; // bigint
  credit_expires_at: string | null;
  id: string;
  is_single_use: boolean;
}

export interface PromoCode {
  code: string;
  codeExpiresAt: Date | null;
  createdAt: Date;
  createdBy: string;
  creditAmountCents: number;
  creditExpiresAt: Date | null;
  id: string;
  isSingleUse: boolean;
}

function decode(row: PromoCodeRow): PromoCode {
  return {
    code: row.code,
    codeExpiresAt:
      row.code_expires_at === null ? null : new Date(row.code_expires_at),
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    creditAmountCents: Number(row.credit_amount_cents),
    creditExpiresAt:
      row.credit_expires_at === null ? null : new Date(row.credit_expires_at),
    id: row.id,
    isSingleUse: row.is_single_use,
  };
}

function forInsertion(data: Uninserted<PromoCode>): Uninserted<PromoCodeRow> {
  return {
    code: data.code,
    code_expires_at: data.codeExpiresAt && data.codeExpiresAt.toISOString(),
    created_by: data.createdBy,
    credit_amount_cents: String(data.creditAmountCents),
    credit_expires_at:
      data.creditExpiresAt && data.creditExpiresAt.toISOString(),
    id: data.id,
    is_single_use: data.isSingleUse,
  };
}

function encode(data: PromoCode): PromoCodeRow {
  return {
    ...forInsertion(data),
    created_at: data.createdAt.toISOString(),
  };
}

export const dataAdapter = new DataAdapter<PromoCodeRow, PromoCode>(
  decode,
  encode,
  forInsertion
);

export function isPromoCodeRow(row: object): row is PromoCodeRow {
  return hasProperties(
    row,
    "id",
    "created_at",
    "created_by",
    "credit_amount_cents",
    "code_expires_at",
    "credit_expires_at",
    "is_single_use"
  );
}

export function isPromoCode(row: object): row is PromoCode {
  return hasProperties(
    row,
    "id",
    "createdAt",
    "createdBy",
    "creditAmountCents",
    "codeExpiresAt",
    "creditExpiresAt",
    "isSingleUse"
  );
}
