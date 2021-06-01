import convert from "koa-convert";
import { z } from "zod";
import Knex from "knex";
import uuid from "node-uuid";

import db from "../../services/db";
import requireAdmin from "../../middleware/require-admin";
import requireAuth from "../../middleware/require-auth";
import { StrictContext } from "../../router-context";

import { rawDao as FinancingAccountsRawDAO } from "./dao";
import { FinancingAccountDb } from "./types";

const createAccountRequestSchema = z.object({
  teamId: z.string(),
  termLengthDays: z.number(),
  feeBasisPoints: z.number(),
  creditLimitCents: z.number(),
});

async function create(ctx: StrictContext<FinancingAccountDb>) {
  const result = createAccountRequestSchema.safeParse(ctx.request.body);

  ctx.assert(result.success, 400, "Request does not match type.");

  return db.transaction(async (trx: Knex.Transaction) => {
    const created = await FinancingAccountsRawDAO.create(trx, {
      ...result.data,
      id: uuid.v4(),
      createdAt: new Date(),
      closedAt: null,
    });

    ctx.body = created;
    ctx.status = 201;
  });
}

const findAccountQuerySchema = z.object({
  teamId: z.string(),
});

async function find(ctx: StrictContext<FinancingAccountDb[]>) {
  const queryResult = findAccountQuerySchema.safeParse(ctx.request.query);

  ctx.assert(queryResult.success, 400, "Must provide a team ID to filter on");

  const found = await FinancingAccountsRawDAO.find(db, {
    teamId: queryResult.data.teamId,
  });

  ctx.body = found;
  ctx.status = 200;
}

export default {
  prefix: "/financing-accounts",
  routes: {
    "/": {
      post: [requireAuth, requireAdmin, convert.back(create)],
      get: [requireAuth, requireAdmin, convert.back(find)],
    },
  },
};
