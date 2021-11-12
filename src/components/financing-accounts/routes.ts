import convert from "koa-convert";
import { z } from "zod";
import Knex from "knex";
import uuid from "node-uuid";

import db from "../../services/db";
import requireAdmin from "../../middleware/require-admin";
import requireAuth from "../../middleware/require-auth";
import { StrictContext } from "../../router-context";

import FinancingAccountsDAO from "./dao";
import { FinancingAccount } from "./types";

const createAccountRequestSchema = z.object({
  teamId: z.string(),
  termLengthDays: z.number(),
  feeBasisPoints: z.number(),
  creditLimitCents: z.number(),
});

async function create(ctx: StrictContext<FinancingAccount>) {
  const result = createAccountRequestSchema.safeParse(ctx.request.body);

  ctx.assert(result.success, 400, "Request does not match type.");

  return db.transaction(async (trx: Knex.Transaction) => {
    const created = await FinancingAccountsDAO.create(trx, {
      ...result.data,
      id: uuid.v4(),
      createdAt: new Date(),
      closedAt: null,
    });
    const found = await FinancingAccountsDAO.findById(trx, created.id);
    ctx.assert(
      found,
      404,
      `Could not find created financing account ${created.id}`
    );

    ctx.body = found;
    ctx.status = 201;
  });
}

const findAccountQuerySchema = z.object({
  teamId: z.string(),
});

async function find(ctx: StrictContext<FinancingAccount[]>) {
  const queryResult = findAccountQuerySchema.safeParse(ctx.request.query);

  ctx.assert(queryResult.success, 400, "Must provide a team ID to filter on");

  const found = await FinancingAccountsDAO.find(db, {
    teamId: queryResult.data.teamId,
  });

  ctx.body = found;
  ctx.status = 200;
}

const updateAccountRequestSchema = z.object({
  closedAt: z
    .string()
    .nullable()
    .transform((maybeDateString: string | null) =>
      maybeDateString ? new Date(maybeDateString) : null
    ),
});

interface UpdateAccountContext extends StrictContext<FinancingAccount> {
  params: { accountId: string };
}

async function update(ctx: UpdateAccountContext) {
  const result = updateAccountRequestSchema.safeParse(ctx.request.body);
  ctx.assert(result.success, 400, "Request does not match type.");

  const { data: patch } = result;

  return db.transaction(async (trx: Knex.Transaction) => {
    const { updated } = await FinancingAccountsDAO.update(
      trx,
      ctx.params.accountId,
      {
        closedAt: patch.closedAt,
      }
    );
    const found = await FinancingAccountsDAO.findById(trx, updated.id);
    ctx.assert(
      found,
      404,
      `Could not find updated financing account ${updated.id}`
    );

    ctx.body = found;
    ctx.status = 200;
  });
}

export default {
  prefix: "/financing-accounts",
  routes: {
    "/": {
      post: [requireAuth, requireAdmin, convert.back(create)],
      get: [requireAuth, requireAdmin, convert.back(find)],
    },
    "/:accountId": {
      patch: [requireAuth, requireAdmin, convert.back(update)],
    },
  },
};
