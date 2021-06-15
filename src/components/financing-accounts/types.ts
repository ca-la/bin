import { z } from "zod";

export const financingAccountDbSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  closedAt: z.date().nullable(),
  teamId: z.string(),
  termLengthDays: z.number(),
  feeBasisPoints: z.number(),
  creditLimitCents: z.number(),
});
export type FinancingAccountDb = z.infer<typeof financingAccountDbSchema>;

export const financingAccountDbRowSchema = z.object({
  id: financingAccountDbSchema.shape.id,
  created_at: financingAccountDbSchema.shape.createdAt,
  closed_at: financingAccountDbSchema.shape.closedAt,
  team_id: financingAccountDbSchema.shape.teamId,
  term_length_days: financingAccountDbSchema.shape.termLengthDays,
  fee_basis_points: financingAccountDbSchema.shape.feeBasisPoints,
  credit_limit_cents: z
    .union([z.number(), z.string()])
    .transform((maybeNumber: number | string) => String(maybeNumber)),
});
export type FinancingAccountDbRow = z.infer<typeof financingAccountDbRowSchema>;

export const financingAccountSchema = financingAccountDbSchema.extend({
  availableBalanceCents: z.number(),
});
export type FinancingAccount = z.infer<typeof financingAccountSchema>;

export const financingAccountRowSchema = financingAccountDbRowSchema.extend({
  available_balance_cents: z
    .union([z.number(), z.string()])
    .transform((maybeNumber: number | string) => String(maybeNumber)),
});
export type FinancingAccountRow = z.infer<typeof financingAccountRowSchema>;
