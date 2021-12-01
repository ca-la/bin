import Knex from "knex";
import convert from "koa-convert";
import { z } from "zod";
import ResourceNotFoundError from "../../errors/resource-not-found";

import requireAdmin from "../../middleware/require-admin";
import { StrictContext } from "../../router-context";
import db from "../../services/db";
import filterError from "../../services/filter-error";
import { parseContext } from "../../services/parse-context";
import { reverseCollectionCheckout } from "../../services/reverse-collection-checkout";

const createCreditNoteContextSchema = z.object({
  request: z.object({
    body: z.object({
      collectionId: z.string(),
    }),
  }),
});

interface CreateCreditNoteContext extends StrictContext {
  state: AuthedState;
}

async function createCreditNote(ctx: CreateCreditNoteContext) {
  const {
    request: {
      body: { collectionId },
    },
  } = parseContext(ctx, createCreditNoteContextSchema);
  const { userId } = ctx.state;

  await db
    .transaction((trx: Knex.Transaction) =>
      reverseCollectionCheckout(trx, collectionId, userId)
    )
    .catch(
      filterError(ResourceNotFoundError, (err: ResourceNotFoundError) => {
        ctx.throw(404, err.message);
      })
    );

  ctx.status = 204;
}

export default {
  prefix: "credit-notes",
  routes: {
    "/": {
      post: [requireAdmin, convert.back(createCreditNote)],
    },
  },
};
