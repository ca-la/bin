import { fromSchema } from "../../services/cala-component/cala-adapter";
import { defaultEncoder } from "../../services/data-adapter";
import {
  financingAccountDbSchema,
  financingAccountDbRowSchema,
  FinancingAccountDbRow,
  FinancingAccountDb,
} from "./types";

export const rawAdapter = fromSchema({
  modelSchema: financingAccountDbSchema,
  rowSchema: financingAccountDbRowSchema,
  encodeTransformer: (row: FinancingAccountDbRow): FinancingAccountDb => ({
    ...defaultEncoder(row),
    creditLimitCents: parseInt(row.credit_limit_cents, 10),
  }),
});
