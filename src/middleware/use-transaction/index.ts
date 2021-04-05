import { Transaction } from "knex";
import Koa from "koa";
import convert from "koa-convert";

import db from "../../services/db";

export interface TransactionState {
  trx: Transaction;
}

export default convert.back(
  async (
    ctx: Koa.ParameterizedContext<Partial<TransactionState>>,
    next: () => Promise<any>
  ) => {
    if (ctx.state.trx) {
      ctx.throw("Transaction already created");
    }

    const trx = await db.transaction();
    ctx.state.trx = trx;

    try {
      await next();
      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }
);
