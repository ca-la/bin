import { omit } from 'lodash';
import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import * as DesignEventsDAO from '../../dao/design-events';
import { findByDesignId, findById } from '../../dao/pricing-quotes';
import {
  create as createBid,
  findByQuoteId as findBidsByQuoteId
} from '../../dao/bids';
import * as PricingCostInputsDAO from '../../dao/pricing-cost-inputs';
import PricingCostInputs from '../../domain-objects/pricing-cost-input';
import {
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

interface CreateRequest {
  designId: string;
  units: number;
}

function isCreateRequest(body: any): body is CreateRequest {
  return (
    typeof body.designId === 'string' &&
    typeof body.units === 'number'
  );
}

function* createQuote(this: Koa.Application.Context): AsyncIterableIterator<PricingQuote> {
  if (!this.request.body || !isCreateRequest(this.request.body)) {
    this.throw(400, 'Invalid request');
    return;
  }

  const { designId, units } = this.request.body;
  const unitsNumber = Number(units);

  const costInputs: PricingCostInputs[] = yield PricingCostInputsDAO.findByDesignId(designId);

  if (costInputs.length === 0) {
    this.throw(404, 'No costing inputs associated with design ID');
    return;
  }

  const quoteRequest: PricingQuoteRequest = {
    ...omit(costInputs[0], ['id', 'createdAt', 'deletedAt']),
    units: unitsNumber
  };

  const quote = yield generatePricingQuote(quoteRequest);

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

  this.body = quote;
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
    const costInputs: PricingCostInputs[] = yield PricingCostInputsDAO.findByDesignId(designId);

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

router.post('/', requireAuth, createQuote);
router.get('/', requireAuth, getQuotes);
router.get('/:quoteId', getQuote);

router.post('/:quoteId/bids', requireAdmin, createBidForQuote);
router.put('/:quoteId/bids/:bidId', requireAdmin, createBidForQuote);
router.get('/:quoteId/bids', requireAdmin, getBidsForQuote);

export = router.routes();
