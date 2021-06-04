import { z } from "zod";
import Router from "koa-router";
import convert from "koa-convert";

import ResourceNotFoundError from "../../errors/resource-not-found";
import requireAuth from "../../middleware/require-auth";
import { StrictContext } from "../../router-context";
import filterError from "../../services/filter-error";
import { numberStringToNumber } from "../../services/zod-helpers";
import * as PricingCostInputsDAO from "../pricing-cost-inputs/dao";
import { PricingCostInput } from "../pricing-cost-inputs/types";

import { CartDetails, DesignQuote } from "./types";
import { calculateDesignQuote, getCartDetails } from "./service";
import db from "../../services/db";
import Knex from "knex";
import { createQuotePayloadSchema } from "../../services/generate-pricing-quote/types";

const router = new Router();

const forDesignQuerySchema = z.object({
  designId: z.string(),
  units: numberStringToNumber,
});

async function getQuoteForDesign(ctx: StrictContext<DesignQuote>) {
  const result = forDesignQuerySchema.safeParse(ctx.query);
  ctx.assert(result.success, 400, "Must supply designId and units");
  const { designId, units } = result.data;

  const costInputs: PricingCostInput[] = await PricingCostInputsDAO.findByDesignId(
    { designId }
  );

  if (costInputs.length === 0) {
    ctx.throw(404, "No costing inputs associated with design ID");
  }

  const latestInput = costInputs[0];

  const designQuote = await calculateDesignQuote(latestInput, units).catch(
    filterError(ResourceNotFoundError, (err: ResourceNotFoundError) =>
      ctx.throw(404, err.message)
    )
  );

  ctx.body = designQuote;
  ctx.status = 200;
}

interface CreateCartDetailsContext extends StrictContext<CartDetails> {
  state: AuthedState;
}

async function createCartDetails(ctx: CreateCartDetailsContext) {
  const { userId } = ctx.state;
  const bodyResult = z
    .array(createQuotePayloadSchema)
    .safeParse(ctx.request.body);
  ctx.assert(
    bodyResult.success,
    400,
    "Must provide a body with design ID and units"
  );

  const { data: quoteRequests } = bodyResult;

  return db.transaction(async (trx: Knex.Transaction) => {
    ctx.body = await getCartDetails(trx, quoteRequests, userId);
    ctx.status = 200;
  });
}

router.get("/", requireAuth, convert.back(getQuoteForDesign));
router.post("/", requireAuth, convert.back(createCartDetails));

export default router.routes();
