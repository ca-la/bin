import * as Router from 'koa-router';
import * as Koa from 'koa';
import { findById } from '../../dao/pricing-quotes';
import {
  isPricingQuoteRequest,
  PricingQuote,
  PricingQuoteRequest
} from '../../domain-objects/pricing-quote';
import generatePricingQuote from '../../services/generate-pricing-quote';

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

router.post('/', createQuote);
router.get('/:quoteId', getQuote);

export = router.routes();
