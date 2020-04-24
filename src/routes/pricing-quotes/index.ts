import { omit, sum } from 'lodash';
import Router from 'koa-router';
import uuid from 'node-uuid';

import requireAuth = require('../../middleware/require-auth');
import * as CollectionsDAO from '../../components/collections/dao';
import * as PricingCostInputsDAO from '../../components/pricing-cost-inputs/dao';
import * as SlackService from '../../services/slack';
import * as UsersDAO from '../../components/users/dao';
import addMargin from '../../services/add-margin';
import { BidCreationPayload } from '../../components/bids/domain-object';
import filterError = require('../../services/filter-error');
import InvalidDataError from '../../errors/invalid-data';
import requireAdmin = require('../../middleware/require-admin');
import * as DesignEventsDAO from '../../dao/design-events';
import { FINANCING_MARGIN } from '../../config';
import { findByDesignId, findById } from '../../dao/pricing-quotes';
import { hasProperties } from '../../services/require-properties';
import { isCreateRequest } from '../../services/payment';
import {
  create as createBid,
  findByQuoteId as findBidsByQuoteId
} from '../../components/bids/dao';
import PricingCostInput, {
  isUnsavedPricingCostInput,
  PricingCostInputWithoutVersions
} from '../../components/pricing-cost-inputs/domain-object';
import {
  PricingQuote,
  PricingQuoteRequest,
  PricingQuoteRequestWithVersions
} from '../../domain-objects/pricing-quote';
import generatePricingQuote, {
  generateUnsavedQuote,
  generateUnsavedQuoteWithoutVersions,
  UnsavedQuote
} from '../../services/generate-pricing-quote';
import addTimeBuffer from '../../services/add-time-buffer';

const router = new Router();

type BidRequest = Unsaved<BidCreationPayload> | BidCreationPayload;

function isBidRequest(candidate: object): candidate is BidRequest {
  return hasProperties(
    candidate,
    'quoteId',
    'bidPriceCents',
    'description',
    'dueDate',
    'taskTypeIds'
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
    quote.fulfillmentTimeMs
  ]);
  const timeTotalMs = addTimeBuffer(timeTotalMsWithoutBuffer);
  return { payNowTotalCents, payLaterTotalCents, timeTotalMs };
}

function* createQuote(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;

  if (!body || !isCreateRequest(body)) {
    this.throw(400, 'Invalid request');
  }

  const quotes: PricingQuote[] = [];

  for (const payload of body) {
    const { designId, units } = payload;

    const unitsNumber = Number(units);
    const costInputs: PricingCostInput[] = yield PricingCostInputsDAO.findByDesignId(
      {
        designId
      }
    );

    if (costInputs.length === 0) {
      this.throw(404, 'No costing inputs associated with design ID');
    }

    const quoteRequest: PricingQuoteRequestWithVersions = {
      ...omit(costInputs[0], ['id', 'createdAt', 'deletedAt', 'expiresAt']),
      units: unitsNumber
    };

    const quote = yield generatePricingQuote(quoteRequest).catch(
      filterError(InvalidDataError, (err: InvalidDataError) =>
        this.throw(500, err)
      )
    );

    quotes.push(quote);

    yield DesignEventsDAO.create({
      actorId: this.state.userId,
      approvalSubmissionId: null,
      bidId: null,
      createdAt: new Date(),
      designId,
      id: uuid.v4(),
      quoteId: quote.id,
      targetId: null,
      approvalStepId: null,
      type: 'COMMIT_QUOTE'
    });
  }

  const collections = yield CollectionsDAO.findByDesign(body[0].designId);
  const user = yield UsersDAO.findById(this.state.userId);
  const payLaterTotalCents = quotes.reduce(
    (acc: number, quote: PricingQuote): number => {
      return acc + calculateAmounts(quote).payLaterTotalCents;
    },
    0
  );
  SlackService.enqueueSend({
    channel: 'designers',
    params: {
      collection: collections[0],
      designer: user,
      payLaterTotalCents
    },
    templateName: 'designer_pay_later'
  });

  this.body = quotes;
  this.status = 201;
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
    this.throw(400, 'You must pass a design ID');
  } else if (unitsNumber) {
    const costInputs: PricingCostInput[] = yield PricingCostInputsDAO.findByDesignId(
      {
        designId
      }
    );

    if (costInputs.length === 0) {
      this.throw(404, 'No costing inputs associated with design ID');
    }

    const quoteRequest: PricingQuoteRequestWithVersions = {
      ...omit(costInputs[0], ['id', 'createdAt', 'deletedAt', 'expiresAt']),
      units: unitsNumber
    };

    const unsavedQuote = yield generateUnsavedQuote(quoteRequest).catch(
      filterError(InvalidDataError, (err: InvalidDataError) =>
        this.throw(500, err)
      )
    );

    const {
      payLaterTotalCents,
      payNowTotalCents,
      timeTotalMs
    } = calculateAmounts(unsavedQuote);

    this.body = {
      designId,
      payLaterTotalCents,
      payNowTotalCents,
      timeTotalMs,
      units: unsavedQuote.units
    };
    this.status = 200;
  } else {
    if (this.state.role !== 'ADMIN') {
      this.throw(403, 'Only admins can retrieve saved quotes');
    }

    const quotes = yield findByDesignId(designId);

    this.body = quotes;
    this.status = 200;
  }
}

interface PreviewQuoteBody {
  units: string;
  uncommittedCostInput: object;
}

function isPreviewQuoteBody(candidate: object): candidate is PreviewQuoteBody {
  return hasProperties(candidate, 'units', 'uncommittedCostInput');
}

type Nullable<T> = { [P in keyof T]: T[P] | null };

function hasNullValuesPricingCostInput(
  candidate: Nullable<Unsaved<PricingCostInputWithoutVersions>>
): boolean {
  return (
    candidate.productType === null ||
    candidate.productComplexity === null ||
    candidate.materialCategory === null ||
    candidate.processes === null ||
    candidate.designId === null
  );
}

function* previewQuote(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;

  if (!isPreviewQuoteBody(body)) {
    this.throw(
      400,
      'units and uncommittedCostInput is required in the request body!'
    );
  }

  const units = Number(body.units);
  if (
    !isUnsavedPricingCostInput(body.uncommittedCostInput) ||
    !units ||
    hasNullValuesPricingCostInput(body.uncommittedCostInput)
  ) {
    this.throw(
      400,
      'A cost input object and units are required to generate a preview quote!'
    );
  }

  const quoteRequest: PricingQuoteRequest = omit(
    {
      ...omit(body.uncommittedCostInput, [
        'id',
        'createdAt',
        'deletedAt',
        'expiresAt'
      ]),
      units
    },
    'expiresAt'
  );

  const unsavedQuote = yield generateUnsavedQuoteWithoutVersions(
    quoteRequest
  ).catch(
    filterError(InvalidDataError, (err: InvalidDataError) =>
      this.throw(500, err)
    )
  );

  const {
    payLaterTotalCents,
    payNowTotalCents,
    timeTotalMs
  } = calculateAmounts(unsavedQuote);

  this.body = {
    payLaterTotalCents,
    payLaterTotalCentsPerUnit: Math.round(payLaterTotalCents / units),
    payNowTotalCents,
    payNowTotalCentsPerUnit: Math.round(payNowTotalCents / units),
    timeTotalMs
  };
  this.status = 200;
}

function* createBidForQuote(this: AuthedContext): Iterator<any, any, any> {
  const { quoteId, bidId } = this.params;
  const { body } = this.request;
  const quote: PricingQuote | null = yield findById(quoteId);
  this.assert(quote, 404, 'No quote found for ID');

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
      taskTypeIds: body.taskTypeIds
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

router.post('/', requireAuth, createQuote);
router.get('/', requireAuth, getQuotes);
router.get('/:quoteId', getQuote);

router.post('/preview', requireAdmin, previewQuote);

router.post('/:quoteId/bids', requireAdmin, createBidForQuote);
router.put('/:quoteId/bids/:bidId', requireAdmin, createBidForQuote);
router.get('/:quoteId/bids', requireAdmin, getBidsForQuote);

export = router.routes();
