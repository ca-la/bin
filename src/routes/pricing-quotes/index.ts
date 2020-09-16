import { sum } from "lodash";
import Router from "koa-router";
import uuid from "node-uuid";

import requireAuth = require("../../middleware/require-auth");
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import addMargin from "../../services/add-margin";
import { BidCreationPayload } from "../../components/bids/domain-object";
import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import ResourceNotFoundError from "../../errors/resource-not-found";
import requireAdmin = require("../../middleware/require-admin");
import { FINANCING_MARGIN } from "../../config";
import { findByDesignId, findById } from "../../dao/pricing-quotes";
import { hasProperties } from "../../services/require-properties";
import {
  create as createBid,
  findByQuoteId as findBidsByQuoteId,
} from "../../components/bids/dao";
import PricingCostInput from "../../components/pricing-cost-inputs/domain-object";
import { PricingQuote } from "../../domain-objects/pricing-quote";
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

type BidRequest = Unsaved<BidCreationPayload> | BidCreationPayload;

function isBidRequest(candidate: object): candidate is BidRequest {
  return hasProperties(
    candidate,
    "quoteId",
    "bidPriceCents",
    "description",
    "dueDate",
    "taskTypeIds",
    "revenueShareBasisPoints"
  );
}

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

  const { units, uncommittedCostInput } = body;

  const unsavedQuote = yield generateUnsavedQuoteWithoutVersions(
    uncommittedCostInput,
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

function* createBidForQuote(this: AuthedContext): Iterator<any, any, any> {
  const { quoteId, bidId } = this.params;
  const { body } = this.request;
  const quote: PricingQuote | null = yield findById(quoteId);
  this.assert(quote, 404, "No quote found for ID");

  if (body && isBidRequest(body)) {
    const bid = yield createBid({
      acceptedAt: null,
      bidPriceCents: body.bidPriceCents,
      bidPriceProductionOnlyCents: body.bidPriceProductionOnlyCents,
      completedAt: null,
      createdBy: this.state.userId,
      description: body.description,
      dueDate: body.dueDate,
      id: bidId || uuid.v4(),
      quoteId: body.quoteId,
      taskTypeIds: body.taskTypeIds,
      revenueShareBasisPoints: body.revenueShareBasisPoints,
    });

    this.body = bid;
    this.status = 201;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

function* getBidsForQuote(this: AuthedContext): Iterator<any, any, any> {
  const { quoteId } = this.params;
  const quote = yield findById(quoteId);
  this.assert(quote, 404);

  const bids = yield findBidsByQuoteId(quoteId);

  this.body = bids;
  this.status = 200;
}

router.get("/", requireAuth, getQuotes);
router.get("/:quoteId", getQuote);

router.post("/preview", requireAdmin, previewQuote);

router.post("/:quoteId/bids", requireAdmin, createBidForQuote);
router.put("/:quoteId/bids/:bidId", requireAdmin, createBidForQuote);
router.get("/:quoteId/bids", requireAdmin, getBidsForQuote);

export = router.routes();
