import { z } from "zod";
import Router from "koa-router";
import convert from "koa-convert";

import ResourceNotFoundError from "../../errors/resource-not-found";
import { safeQuery, SafeQueryState } from "../../middleware/type-guard";
import requireAuth from "../../middleware/require-auth";
import { StrictContext } from "../../router-context";
import filterError from "../../services/filter-error";
import { numberStringToNumber } from "../../services/zod-helpers";
import * as PricingCostInputsDAO from "../pricing-cost-inputs/dao";
import { PricingCostInput } from "../pricing-cost-inputs/types";

import { DesignQuote } from "./types";
import { calculateDesignQuote } from "./service";

const router = new Router();

const getQuotesQuerySchema = z.object({
  designId: z.string(),
  units: numberStringToNumber,
});
type GetQuotesQueryParams = z.infer<typeof getQuotesQuerySchema>;

interface GetQuotesContext extends StrictContext<DesignQuote> {
  state: AuthedState & SafeQueryState<GetQuotesQueryParams>;
}

async function getQuoteForDesign(ctx: GetQuotesContext) {
  const { designId, units } = ctx.state.safeQuery;

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

router.get(
  "/",
  requireAuth,
  safeQuery<GetQuotesQueryParams>(getQuotesQuerySchema),
  convert.back(getQuoteForDesign)
);

export default router.routes();
