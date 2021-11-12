import Knex from "knex";
import { buildDao } from "../../services/cala-component/cala-dao";
import db from "../../services/db";
import {
  FinancingAccount,
  FinancingAccountDb,
  FinancingAccountDbRow,
  FinancingAccountRow,
} from "./types";
import { adapter, rawAdapter } from "./adapter";

const TABLE_NAME = "financing_accounts";

export const rawDao = buildDao<FinancingAccountDb, FinancingAccountDbRow>(
  "FinancingAccountDb" as const,
  TABLE_NAME,
  rawAdapter,
  {
    orderColumn: "created_at",
    excludeDeletedAt: false, // no `deleted_at` column
  }
);

const standardDao = buildDao<FinancingAccount, FinancingAccountRow>(
  "FinancingAccount" as const,
  TABLE_NAME,
  adapter,
  {
    queryModifier: (query: Knex.QueryBuilder) =>
      query
        .select(
          db.raw(
            `
financing_accounts.credit_limit_cents
  + (coalesce(sum(credit_transactions.credit_delta_cents), 0))
AS available_balance_cents`
          )
        )
        .leftJoin(
          "credit_transactions",
          "financing_account_id",
          "financing_accounts.id"
        )
        .groupBy(["financing_accounts.id"]),
    orderColumn: "created_at",
    excludeDeletedAt: false, // no `deleted_at` column
  }
);

function findActive(
  ktx: Knex,
  filter: Partial<FinancingAccountDb>
): Promise<FinancingAccount | null> {
  return standardDao.findOne(ktx, { ...filter, closedAt: null });
}

export default {
  create: rawDao.create,
  update: rawDao.update,
  find: standardDao.find,
  findById: standardDao.findById,
  findActive,
};
