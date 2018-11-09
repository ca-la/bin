import * as Router from 'koa-router';
import * as Koa from 'koa';
import { findByDesignId, findById } from '../../dao/pricing-quotes';
import { create as createBid } from '../../dao/bids';
import {
  isPricingQuoteRequest,
  PricingQuote,
  PricingQuoteRequest
} from '../../domain-objects/pricing-quote';
import requireAdmin = require('../../middleware/require-admin');
import generatePricingQuote from '../../services/generate-pricing-quote';
import Bid, { isBid } from '../../domain-objects/bid';

const router = new Router();

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
  const { designId } = this.query;

  if (!designId) {
    this.throw(400, 'You must pass a design ID');
  } else {
    const quotes = yield findByDesignId(designId);

    this.body = quotes;
    this.status = 200;
  }
}

function* createBidForQuote(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { quoteId, bidId } = this.params;
  const { body } = this.request;
  const quote = yield findById(quoteId);
  this.assert(quote, 404);

  if (body && isBid(body)) {
    const bidRequest: Bid = body;
    this.assert(
      bidRequest.id === bidId,
      400,
      `Bid ID in path does not match request body ID:
in path: ${bidId}
in request: ${bidRequest.id}`
    );

    const bid = yield createBid(bidRequest);

    this.body = bid;
    this.status = 201;
  } else {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }
}

router.post('/', createQuote);
router.get('/', requireAdmin, getQuotes);
router.get('/:quoteId', getQuote);

router.put('/:quoteId/bid/:bidId', requireAdmin, createBidForQuote);

export = router.routes();
