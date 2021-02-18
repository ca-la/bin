import { sum } from "lodash";
import Router from "koa-router";
import db from "../../services/db";

import requireAuth = require("../../middleware/require-auth");
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import addMargin from "../../services/add-margin";
import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import ResourceNotFoundError from "../../errors/resource-not-found";
import requireAdmin = require("../../middleware/require-admin");
import { FINANCING_MARGIN } from "../../config";
import { findByDesignId, findById } from "../../dao/pricing-quotes";
import { findByQuoteId as findBidsByQuoteId } from "../../components/bids/dao";
import PricingCostInput from "../../components/pricing-cost-inputs/domain-object";
import {
  generateUnsavedQuote,
  generateUnsavedQuoteWithoutVersions,
  UnsavedQuote,
} from "../../services/generate-pricing-quote";
import addTimeBuffer from "../../services/add-time-buffer";
import {
  CreatePricingCostInputRequest,
  isCreatePricingCostInputRequest,
} from "../../components/pricing-cost-inputs/types";

const router = new Router();

function calculateAmounts(
  quote: UnsavedQuote
): {
  payNowTotalCents: number;
  payLaterTotalCents: number;
  timeTotalMs: number;
} {
  const payNowTotalCents = quote.units * quote.unitCostCents;
  const payLaterTotalCents = addMargin(payNowTotalCents, FINANCING_MARGIN);
  const timeTotalMsWithoutBuffer = sum([
    quote.creationTimeMs,
    quote.specificationTimeMs,
    quote.sourcingTimeMs,
    quote.samplingTimeMs,
    quote.preProductionTimeMs,
    quote.processTimeMs,
    quote.productionTimeMs,
    quote.fulfillmentTimeMs,
  ]);
  const timeTotalMs = addTimeBuffer(timeTotalMsWithoutBuffer);
  return { payNowTotalCents, payLaterTotalCents, timeTotalMs };
}

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
    const costInputs: PricingCostInput[] = yield PricingCostInputsDAO.findByDesignId(
      {
        designId,
      }
    );

    if (costInputs.length === 0) {
      this.throw(404, "No costing inputs associated with design ID");
    }

    const latestInput = costInputs[0];

    const unsavedQuote = yield generateUnsavedQuote(
      latestInput,
      unitsNumber
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
      designId,
      payLaterTotalCents,
      payNowTotalCents,
      timeTotalMs,
      units: unsavedQuote.units,
      minimumOrderQuantity: latestInput.minimumOrderQuantity,
    };
    this.status = 200;
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
