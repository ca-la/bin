import { z } from "zod";

export const partnerPayoutLogDbSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  invoiceId: z.string().nullable(),
  payoutAccountId: z.string().nullable(),
  payoutAmountCents: z.number().int(),
  message: z.string(),
  initiatorUserId: z.string(),
  shortId: z.string().nullable(),
  bidId: z.string().nullable(),
  isManual: z.boolean(),
});
export type PartnerPayoutLogDb = z.infer<typeof partnerPayoutLogDbSchema>;

export const partnerPayoutLogDbRowSchema = z.object({
  id: partnerPayoutLogDbSchema.shape.id,
  created_at: partnerPayoutLogDbSchema.shape.createdAt,
  invoice_id: partnerPayoutLogDbSchema.shape.invoiceId,
  payout_account_id: partnerPayoutLogDbSchema.shape.payoutAccountId,
  payout_amount_cents: partnerPayoutLogDbSchema.shape.payoutAmountCents,
  message: partnerPayoutLogDbSchema.shape.message,
  initiator_user_id: partnerPayoutLogDbSchema.shape.initiatorUserId,
  short_id: partnerPayoutLogDbSchema.shape.shortId,
  bid_id: partnerPayoutLogDbSchema.shape.bidId,
  is_manual: partnerPayoutLogDbSchema.shape.isManual,
});
export type PartnerPayoutLogDbRow = z.infer<typeof partnerPayoutLogDbRowSchema>;

export const partnerPayoutLogSchema = partnerPayoutLogDbSchema.extend({
  payoutAccountUserId: z.string().nullable(),
  collectionTitle: z.string().nullable(),
  collectionId: z.string().nullable(),
});
export type PartnerPayoutLog = z.infer<typeof partnerPayoutLogSchema>;

export const partnerPayoutLogRowSchema = partnerPayoutLogDbRowSchema.extend({
  payout_account_user_id: partnerPayoutLogSchema.shape.payoutAccountUserId,
  collection_title: partnerPayoutLogSchema.shape.collectionTitle,
  collection_id: partnerPayoutLogSchema.shape.collectionId,
});
export type PartnerPayoutLogRow = z.infer<typeof partnerPayoutLogRowSchema>;
