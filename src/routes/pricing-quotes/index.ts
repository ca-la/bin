import { omit } from 'lodash';
import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import { findByDesignId, findById } from '../../dao/pricing-quotes';
import {
  create as createBid,
  findByQuoteId as findBidsByQuoteId
} from '../../dao/bids';
import {
  findByDesignId as findCostInputsByDesignId
} from '../../dao/pricing-cost-inputs';
import PricingCostInputs from '../../domain-objects/pricing-cost-input';
import {
  isPricingQuoteRequest,
  PricingQuote,
  PricingQuoteRequest
} from '../../domain-objects/pricing-quote';
import requireAdmin = require('../../middleware/require-admin');
import requireAuth = require('../../middleware/require-auth');
import { hasProperties } from '../../services/require-properties';
import generatePricingQuote, {
  generateUnsavedQuote
} from '../../services/generate-pricing-quote';
import Bid from '../../domain-objects/bid';

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

function* createQuote(this: Koa.Application.Context): AsyncIterableIterator<PricingQuote> {
  if (this.request.body && isPricingQuoteRequest(this.request.body)) {
    const quoteRequest: PricingQuoteRequest = this.request.body;
    const quote: PricingQuote = yield generatePricingQuote(quoteRequest);

    this.body = quote;
    this.status = 201;
  } else {
    this.throw(400);
  }
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
    const costInputs: PricingCostInputs[] = yield findCostInputsByDesignId(designId);

    if (costInputs.length === 0) {
      this.throw(404, 'No costing inputs associated with design ID');
      return;
    }

    const quoteRequest: PricingQuoteRequest = {
      ...omit(costInputs[0], ['id', 'createdAt', 'deletedAt']),
      units: unitsNumber
    };
    const unsavedQuote = yield generateUnsavedQuote(quoteRequest);

    this.body = unsavedQuote;
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

router.post('/', createQuote);
router.get('/', requireAuth, getQuotes);
router.get('/:quoteId', getQuote);

router.post('/:quoteId/bids', requireAdmin, createBidForQuote);
router.put('/:quoteId/bids/:bidId', requireAdmin, createBidForQuote);
router.get('/:quoteId/bids', requireAdmin, getBidsForQuote);

export = router.routes();
