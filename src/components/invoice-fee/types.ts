import { z } from "zod";

export enum InvoiceFeeType {
  FINANCING = "FINANCING",
}

export const invoiceFeeTypeSchema = z.nativeEnum(InvoiceFeeType);

export const invoiceFeeSchema = z.object({
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  description: z.string().nullable(),
  id: z.string(),
  invoiceId: z.string(),
  title: z.string().nullable(),
  totalCents: z.number(),
  type: invoiceFeeTypeSchema,
});

export type InvoiceFee = z.infer<typeof invoiceFeeSchema>;

export const invoiceFeeRowSchema = z.object({
  created_at: invoiceFeeSchema.shape.createdAt,
  deleted_at: invoiceFeeSchema.shape.deletedAt,
  description: invoiceFeeSchema.shape.description,
  id: invoiceFeeSchema.shape.id,
  invoice_id: invoiceFeeSchema.shape.invoiceId,
  title: invoiceFeeSchema.shape.title,
  total_cents: invoiceFeeSchema.shape.totalCents,
  type: invoiceFeeSchema.shape.type,
});

export type InvoiceFeeRow = z.infer<typeof invoiceFeeSchema>;
