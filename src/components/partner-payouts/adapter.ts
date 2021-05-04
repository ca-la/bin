import { fromSchema } from "../../services/cala-component/cala-adapter";
import {
  PartnerPayoutLog,
  PartnerPayoutLogDb,
  PartnerPayoutLogDbRow,
  partnerPayoutLogDbRowSchema,
  partnerPayoutLogDbSchema,
  PartnerPayoutLogRow,
  partnerPayoutLogRowSchema,
  partnerPayoutLogSchema,
} from "./types";

export const rawAdapter = fromSchema({
  modelSchema: partnerPayoutLogDbSchema,
  rowSchema: partnerPayoutLogDbRowSchema,
  encodeTransformer: (row: PartnerPayoutLogDbRow): PartnerPayoutLogDb => ({
    bidId: row.bid_id,
    createdAt: row.created_at,
    id: row.id,
    initiatorUserId: row.initiator_user_id,
    invoiceId: row.invoice_id,
    isManual: row.is_manual,
    message: row.message,
    payoutAccountId: row.payout_account_id,
    payoutAmountCents: row.payout_amount_cents,
    shortId: row.short_id,
  }),
});

export default fromSchema({
  modelSchema: partnerPayoutLogSchema,
  rowSchema: partnerPayoutLogRowSchema,
  encodeTransformer: (row: PartnerPayoutLogRow): PartnerPayoutLog => ({
    bidId: row.bid_id,
    createdAt: row.created_at,
    id: row.id,
    initiatorUserId: row.initiator_user_id,
    invoiceId: row.invoice_id,
    isManual: row.is_manual,
    message: row.message,
    payoutAccountId: row.payout_account_id,
    payoutAmountCents: row.payout_amount_cents,
    shortId: row.short_id,
    collectionId: row.collection_id,
    collectionTitle: row.collection_title,
    payoutAccountUserId: row.payout_account_user_id,
  }),
});
