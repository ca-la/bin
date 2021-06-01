import { buildDao } from "../../services/cala-component/cala-dao";
import { FinancingAccountDb, FinancingAccountDbRow } from "./types";
import { rawAdapter } from "./adapter";

const TABLE_NAME = "financing_accounts";

export const rawDao = buildDao<FinancingAccountDb, FinancingAccountDbRow>(
  "FinancingAccountDb" as const,
  TABLE_NAME,
  rawAdapter,
  {
    orderColumn: "created_at",
  }
);
