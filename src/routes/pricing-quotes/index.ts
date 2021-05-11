import Router from "koa-router";
import db from "../../services/db";

import requireAuth = require("../../middleware/require-auth");
import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import ResourceNotFoundError from "../../errors/resource-not-found";
import requireAdmin = require("../../middleware/require-admin");
import { findByDesignId, findById } from "../../dao/pricing-quotes";
import { findByQuoteId as findBidsByQuoteId } from "../../components/bids/dao";
import {
  calculateAmounts,
  generateUnsavedQuoteWithoutVersions,
} from "../../services/generate-pricing-quote";
import {
  CreatePricingCostInputRequest,
  isCreatePricingCostInputRequest,
} from "../../components/pricing-cost-inputs/types";

const router = new Router();

function* getQuote(this: AuthedContext): Iterator<any, any, any> {
  const { quoteId } = this.params;

  const quote = yield findById(quoteId);
  this.assert(quote, 404);

  this.body = quote;
  this.status = 200;
}

function* getQuotes(this: AuthedContext): Iterator<any, any, any> {
  const { designId, units } = this.query;
  const unitsNumber = Number(units);

  if (!designId) {
    this.throw(400, "You must pass a design ID");
  } else if (unitsNumber) {
    this.redirect(`/design-quotes?designId=${designId}&units=${unitsNumber}`);
  } else {
    if (this.state.role !== "ADMIN") {
      this.throw(403, "Only admins can retrieve saved quotes");
    }

    const quotes = yield findByDesignId(designId);

    this.body = quotes;
    this.status = 200;
  }
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

  const unsavedQuote = yield generateUnsavedQuoteWithoutVersions(
    {
      minimumOrderQuantity,
      designId: uncommittedCostInput.designId,
      materialBudgetCents: uncommittedCostInput.materialBudgetCents,
      materialCategory: uncommittedCostInput.materialCategory,
      processes: uncommittedCostInput.processes,
      productComplexity: uncommittedCostInput.productComplexity,
      productType: uncommittedCostInput.productType,
    },
    units
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

router.get("/", requireAuth, getQuotes);
router.get("/:quoteId", getQuote);

router.post("/preview", requireAdmin, previewQuote);

router.get("/:quoteId/bids", requireAdmin, getBidsForQuote);

export = router.routes();
