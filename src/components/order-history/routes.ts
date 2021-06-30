import Router from "koa-router";
import convert from "koa-convert";
import { z } from "zod";

import { StrictContext } from "../../router-context";
import requireAuth = require("../../middleware/require-auth");
import { getOrderHistory, InvoiceWithMeta } from "./services/get-order-history";

const router = new Router();

const retrieveOrderHistoryQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((maybeNumStr: string | undefined) =>
      maybeNumStr ? Number(maybeNumStr) : null
    ),
  offset: z
    .string()
    .optional()
    .transform((maybeNumStr: string | undefined) =>
      maybeNumStr ? Number(maybeNumStr) : null
    ),
  type: z.literal("designs"),
});

interface RetrieveOrderHistoryContext extends StrictContext<InvoiceWithMeta[]> {
  state: AuthedState;
}

async function retrieveOrderHistory(ctx: RetrieveOrderHistoryContext) {
  const { userId } = ctx.state;
  const queryResult = retrieveOrderHistoryQuerySchema.safeParse(ctx.query);
  ctx.assert(
    queryResult.success,
    400,
    "Must provide limit, offset, and type in query"
  );
  const { limit, offset } = queryResult.data;

  ctx.body = await getOrderHistory({
    limit,
    offset,
    userId,
  });
  ctx.status = 200;
}

router.get("/", requireAuth, convert.back(retrieveOrderHistory));

export default router.routes();
