import { omit } from 'lodash';
import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import { FINANCING_MARGIN } from '../../config';
import * as DesignEventsDAO from '../../dao/design-events';
import { findByDesignId, findById } from '../../dao/pricing-quotes';
import {
  create as createBid,
  findByQuoteId as findBidsByQuoteId
} from '../../dao/bids';
import * as PricingCostInputsDAO from '../../dao/pricing-cost-inputs';
import PricingCostInput, {
  isUnsavedPricingCostInput
} from '../../domain-objects/pricing-cost-input';
import {
  PricingQuote,
  PricingQuoteRequest
} from '../../domain-objects/pricing-quote';
import requireAdmin = require('../../middleware/require-admin');
import requireAuth = require('../../middleware/require-auth');
import { hasProperties } from '../../services/require-properties';
import generatePricingQuote, {
  generateUnsavedQuote,
  UnsavedQuote
} from '../../services/generate-pricing-quote';
import Bid from '../../domain-objects/bid';
import { isCreateRequest } from '../../services/payment';
import * as SlackService from '../../services/slack';
import * as CollectionsDAO from '../../dao/collections';
import * as UsersDAO from '../../dao/users';

const router = new Router();

type BidRequest = Unsaved<Bid> | Bid;

function isBidRequest(candidate: object): candidate is BidRequest {
  return hasProperties(
    candidate,
    'quoteId',
    'bidPriceCents',
    'description'
  );
}

function calculateAmounts(
  quote: UnsavedQuote
): { payNowTotalCents: number; payLaterTotalCents: number } {
  const financingMargin = 1 - FINANCING_MARGIN;
  const payNowTotalCents = quote.units * quote.unitCostCents;
  const payLaterTotalCents = Math.ceil(payNowTotalCents / financingMargin);
  return { payNowTotalCents, payLaterTotalCents };
}

function* createQuote(this: Koa.Application.Context): AsyncIterableIterator<PricingQuote> {
  const { body } = this.request;

  if (!body || !isCreateRequest(body)) {
    this.throw(400, 'Invalid request');
    return;
  }

  const quotes: PricingQuote[] = [];

  for (const payload of body) {
    const { designId, units } = payload;

    const unitsNumber = Number(units);
    const costInputs: PricingCostInput[] = yield PricingCostInputsDAO.findByDesignId(designId);

    if (costInputs.length === 0) {
      this.throw(404, 'No costing inputs associated with design ID');
      return;
    }

    const quoteRequest: PricingQuoteRequest = {
      ...omit(costInputs[0], ['id', 'createdAt', 'deletedAt']),
      units: unitsNumber
    };

    const quote = yield generatePricingQuote(quoteRequest);
    quotes.push(quote);

    yield DesignEventsDAO.create({
      actorId: this.state.userId,
      bidId: null,
      createdAt: new Date(),
      designId,
      id: uuid.v4(),
      quoteId: quote.id,
      targetId: null,
      type: 'COMMIT_QUOTE'
    });
  }

  const collections = yield CollectionsDAO.findByDesign(body[0].designId);
  const user = yield UsersDAO.findById(this.state.userId);
  const payLaterTotalCents = quotes.reduce((acc: number, quote: PricingQuote): number => {
    return acc + calculateAmounts(quote).payLaterTotalCents;
  }, 0);
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

function* getQuote(this: Koa.Application.Context): AsyncIterableIterator<PricingQuote> {
  const { quoteId } = this.params;

  const quote = yield findById(quoteId);
  this.assert(quote, 404);

  this.body = quote;
  this.status = 200;
}

function* getQuotes(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { designId, units } = this.query;
  const unitsNumber = Number(units);

  if (!designId) {
    this.throw(400, 'You must pass a design ID');
  } else if (unitsNumber) {
    const costInputs: PricingCostInput[] = yield PricingCostInputsDAO.findByDesignId(designId);

    if (costInputs.length === 0) {
      this.throw(404, 'No costing inputs associated with design ID');
      return;
    }

    const quoteRequest: PricingQuoteRequest = {
      ...omit(costInputs[0], ['id', 'createdAt', 'deletedAt']),
      units: unitsNumber
    };
    const unsavedQuote: UnsavedQuote = yield generateUnsavedQuote(quoteRequest);
    const { payLaterTotalCents, payNowTotalCents } = calculateAmounts(unsavedQuote);

    this.body = {
      designId,
      payLaterTotalCents,
      payNowTotalCents,
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
  return hasProperties(
    candidate,
    'units',
    'uncommittedCostInput'
  );
}

function* previewQuote(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body } = this.request;

  if (!isPreviewQuoteBody(body)) {
    this.throw(400, 'units and uncommittedCostInput is required in the request body!');
    return;
  }

  const units = Number(body.units);
  if (!isUnsavedPricingCostInput(body.uncommittedCostInput) || !units) {
    this.throw(400, 'A cost input object and units are required to generate a preview quote!');
    return;
  }

  const quoteRequest: PricingQuoteRequest = {
    ...omit(body.uncommittedCostInput, ['id', 'createdAt', 'deletedAt']),
    units
  };
  const unsavedQuote: UnsavedQuote = yield generateUnsavedQuote(quoteRequest);
  const { payLaterTotalCents, payNowTotalCents } = calculateAmounts(unsavedQuote);

  this.body = {
    payLaterTotalCents,
    payLaterTotalCentsPerUnit: Math.round(payLaterTotalCents / units),
    payNowTotalCents
  };
  this.status = 200;
}

function* createBidForQuote(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { quoteId } = this.params;
  const { body } = this.request;
  const quote = yield findById(quoteId);
  this.assert(quote, 404, 'No quote found for ID');

  if (body && isBidRequest(body)) {
    const bidRequest: BidRequest = body;
    const bid = yield createBid({
      createdAt: new Date(),
      id: uuid.v4(),
      ...bidRequest,
      createdBy: this.state.userId
    });

    this.body = bid;
    this.status = 201;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

function* getBidsForQuote(this: Koa.Application.Context): AsyncIterableIterator<any> {
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
