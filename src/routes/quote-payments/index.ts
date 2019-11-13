import * as Router from 'koa-router';
import * as Koa from 'koa';

import requireAuth = require('../../middleware/require-auth');
import {
  canAccessCollectionInRequestBody,
  canSubmitCollection
} from '../../middleware/can-access-collection';
import { typeGuard } from '../../middleware/type-guard';
import payInvoiceWithNewPaymentMethod, {
  createInvoiceWithoutMethod,
  isCreateRequest,
  payWaivedQuote
} from '../../services/payment';
import { CreateQuotePayload } from '../../services/generate-pricing-quote';
import { hasProperties } from '../../services/require-properties';
import createUPCsForCollection from '../../services/create-upcs-for-collection';

const router = new Router();

interface PayRequest {
  createQuotes: CreateQuotePayload[];
  collectionId: string;
}

interface PayWithMethodRequest extends PayRequest {
  paymentMethodTokenId: string;
}

const isPayRequest = (data: any): data is PayRequest | PayWithMethodRequest => {
  return (
    (hasProperties(data, 'createQuotes', 'collectionId') ||
      hasProperties(
        data,
        'paymentMethodTokenId',
        'createQuotes',
        'collectionId'
      )) &&
    isCreateRequest(data.createQuotes)
  );
};

const isPayWithMethodRequest = (data: any): data is PayWithMethodRequest => {
  return (
    hasProperties(
      data,
      'paymentMethodTokenId',
      'createQuotes',
      'collectionId'
    ) && isCreateRequest(data.createQuotes)
  );
};

function* payQuote(
  this: Koa.Application.Context<PayRequest | PayWithMethodRequest>
): IterableIterator<any> {
  const { body } = this.request;
  const { isFinanced, isWaived } = this.query;
  const { userId, collection } = this.state;
  if (!collection) {
    return this.throw(403, 'Unable to access collection');
  }

  yield createUPCsForCollection(collection.id);

  if (isWaived) {
    this.body = yield payWaivedQuote(body.createQuotes, userId, collection);
  } else if (!isFinanced && isPayWithMethodRequest(body)) {
    this.body = yield payInvoiceWithNewPaymentMethod(
      body.createQuotes,
      body.paymentMethodTokenId,
      userId,
      collection
    ).catch((err: Error) => this.throw(400, err.message));
  } else if (isFinanced) {
    this.body = yield createInvoiceWithoutMethod(
      body.createQuotes,
      userId,
      collection
    ).catch((err: Error) => this.throw(400, err.message));
  } else {
    return this.throw('Request must match type');
  }

  this.status = 201;
}

router.post(
  '/',
  requireAuth,
  canAccessCollectionInRequestBody,
  canSubmitCollection,
  typeGuard<PayRequest | PayWithMethodRequest>(isPayRequest),
  payQuote
);

export = router.routes();
