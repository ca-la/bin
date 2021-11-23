import { z } from "zod";
import { numberStringToNumber } from "../../services/zod-helpers";

export const creditNoteLineItemSchema = z.object({
  id: z.string(),
  creditNoteId: z.string(),
  lineItemId: z.string(),
  createdAt: z.date(),
  cancelledAt: z.date().nullable(),
});

export type CreditNoteLineItem = z.infer<typeof creditNoteLineItemSchema>;

export const creditNoteLineItemRowSchema = z.object({
  id: z.string(),
  credit_note_id: z.string(),
  line_item_id: z.string(),
  created_at: z.date(),
  cancelled_at: z.date().nullable(),
});

export type CreditNoteLineItemRow = z.infer<typeof creditNoteLineItemRowSchema>;

export const creditNoteDbSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  userId: z.string(),
  totalCents: z.number(),
  reason: z.string().nullable(),
  createdAt: z.date(),
  cancelledAt: z.date().nullable(),
});

export type CreditNoteDb = z.infer<typeof creditNoteDbSchema>;

export const creditNoteDbRowSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  user_id: z.string(),
  total_cents: z.union([numberStringToNumber, z.number()]),
  created_at: z.date(),
  cancelled_at: z.date().nullable(),
});

export type CreditNoteDbRow = z.infer<typeof creditNoteDbRowSchema>;

export const creditNoteSchema = creditNoteDbSchema.extend({
  lineItems: z.array(creditNoteLineItemSchema),
});

export type CreditNote = z.infer<typeof creditNoteSchema>;

export const creditNoteRowSchema = creditNoteDbRowSchema.extend({
  line_items: z.array(creditNoteLineItemRowSchema),
});

export type CreditNoteRow = z.infer<typeof creditNoteRowSchema>;
