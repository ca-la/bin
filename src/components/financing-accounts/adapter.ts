import { fromSchema } from "../../services/cala-component/cala-adapter";
import { defaultEncoder } from "../../services/data-adapter";
import {
  financingAccountDbSchema,
  financingAccountDbRowSchema,
  FinancingAccountDbRow,
  FinancingAccountDb,
  FinancingAccountRow,
  FinancingAccount,
  financingAccountSchema,
  financingAccountRowSchema,
} from "./types";

export const rawAdapter = fromSchema({
  modelSchema: financingAccountDbSchema,
  rowSchema: financingAccountDbRowSchema,
  encodeTransformer: (row: FinancingAccountDbRow): FinancingAccountDb => ({
    ...defaultEncoder(row),
    creditLimitCents: parseInt(row.credit_limit_cents, 10),
  }),
});

export const adapter = fromSchema({
  modelSchema: financingAccountSchema,
  rowSchema: financingAccountRowSchema,
  encodeTransformer: (row: FinancingAccountRow): FinancingAccount => ({
    ...defaultEncoder(row),
    creditLimitCents: parseInt(row.credit_limit_cents, 10),
    availableBalanceCents: parseInt(row.available_balance_cents, 10),
  }),
});
