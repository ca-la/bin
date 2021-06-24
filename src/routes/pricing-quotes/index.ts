import Router from "koa-router";
import convert from "koa-convert";
import { z } from "zod";

import db from "../../services/db";

import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import ResourceNotFoundError from "../../errors/resource-not-found";
import requireAdmin = require("../../middleware/require-admin");
import { findByDesignId, findById } from "../../dao/pricing-quotes";
import { findByQuoteId as findBidsByQuoteId } from "../../components/bids/dao";
import { createUnsavedQuoteWithLatest } from "../../services/generate-pricing-quote";
import {
  CreatePricingCostInputRequest,
  isCreatePricingCostInputRequest,
} from "../../components/pricing-cost-inputs/types";
import {
  calculateAmounts,
  getDesignProductionFeeBasisPoints,
} from "../../components/design-quotes/service";
import { StrictContext } from "../../router-context";
import { safeQuery, SafeQueryState } from "../../middleware/type-guard";
import { PricingQuote } from "../../domain-objects/pricing-quote";
import InsufficientPlanError from "../../errors/insufficient-plan";

const router = new Router();

function* getQuote(this: AuthedContext): Iterator<any, any, any> {
  const { quoteId } = this.params;

  const quote = yield findById(quoteId);
  this.assert(quote, 404);

  this.body = quote;
  this.status = 200;
}

const getQuotesQuerySchema = z.object({
  designId: z.string(),
});

type GetQuotesQuery = z.infer<typeof getQuotesQuerySchema>;

interface GetQuotesContext extends StrictContext<PricingQuote[] | null> {
  state: SafeQueryState<GetQuotesQuery>;
}

async function getQuotes(ctx: GetQuotesContext) {
  const { designId } = ctx.state.safeQuery;

  const quotes = await findByDesignId(designId);

  ctx.body = quotes;
  ctx.status = 200;
}

interface PreviewQuoteBody {
  units: number;
  uncommittedCostInput: CreatePricingCostInputRequest;
}

function isPreviewQuoteBody(
  candidate: Record<string, any>
): candidate is PreviewQuoteBody {
  const keyset = new Set(Object.keys(candidate));
  const keysetMatch = ["units", "uncommittedCostInput"].every(
    keyset.has.bind(keyset)
  );

  if (!keysetMatch) {
    return false;
  }

  return isCreatePricingCostInputRequest(candidate.uncommittedCostInput);
}

function* previewQuote(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;

  if (!isPreviewQuoteBody(body)) {
    this.throw(
      400,
      "units and uncommittedCostInput is required in the request body!"
    );
  }

  const {
    units,
    uncommittedCostInput: { minimumOrderQuantity = 1, ...uncommittedCostInput },
  } = body;

  const productionFeeBasisPoints = yield getDesignProductionFeeBasisPoints(
    uncommittedCostInput.designId
  ).catch(filterError(InsufficientPlanError, () => 0));
  const unsavedQuote = yield createUnsavedQuoteWithLatest(
    {
      minimumOrderQuantity,
      designId: uncommittedCostInput.designId,
      materialBudgetCents: uncommittedCostInput.materialBudgetCents,
      materialCategory: uncommittedCostInput.materialCategory,
      processes: uncommittedCostInput.processes,
      productComplexity: uncommittedCostInput.productComplexity,
      productType: uncommittedCostInput.productType,
    },
    units,
    productionFeeBasisPoints
  ).catch(
    filterError(ResourceNotFoundError, (err: InvalidDataError) =>
      this.throw(400, err.message)
    )
  );

  const {
    payLaterTotalCents,
    payNowTotalCents,
    timeTotalMs,
  } = calculateAmounts(unsavedQuote);

  this.body = {
    payLaterTotalCents,
    payLaterTotalCentsPerUnit: Math.round(payLaterTotalCents / units),
    payNowTotalCents,
    payNowTotalCentsPerUnit: Math.round(payNowTotalCents / units),
    timeTotalMs,
  };
  this.status = 200;
}

function* getBidsForQuote(this: AuthedContext): Iterator<any, any, any> {
  const { quoteId } = this.params;
  const quote = yield findById(quoteId);
  this.assert(quote, 404);

  const bids = yield findBidsByQuoteId(db, quoteId);

  this.body = bids;
  this.status = 200;
}

router.get(
  "/",
  requireAdmin,
  safeQuery<GetQuotesQuery>(getQuotesQuerySchema),
  convert.back(getQuotes)
);
router.get("/:quoteId", getQuote);

router.post("/preview", requireAdmin, previewQuote);

router.get("/:quoteId/bids", requireAdmin, getBidsForQuote);

export = router.routes();
