import * as Router from 'koa-router';
import * as Koa from 'koa';

import requireAuth = require('../../middleware/require-auth');
import {
  canAccessCollectionInParam,
  canSubmitCollection
} from '../../middleware/can-access-collection';
import { typeGuard } from '../../middleware/type-guard';
import payInvoiceWithNewPaymentMethod, {
  isCreateRequest
} from '../../services/payment';
import { CreateQuotePayload } from '../../services/generate-pricing-quote';
import { hasProperties } from '../../services/require-properties';

const router = new Router();

interface PayRequest {
  createQuotes: CreateQuotePayload[];
}

interface PayWithMethodRequest extends PayRequest {
  paymentMethodTokenId: string;
}

const isPayWithMethodRequest = (data: any): data is PayWithMethodRequest => {
  return hasProperties(data, 'paymentMethodTokenId', 'createQuotes')
    && isCreateRequest(data.createQuotes);
};

function* payQuoteWithMethod(
  this: Koa.Application.Context<PayWithMethodRequest>
): AsyncIterableIterator<any> {
  const { body } = this.request;
  const { userId, collection } = this.state;
  if (!collection) { return this.throw(403, 'Unable to access collection'); }

  this.body = yield payInvoiceWithNewPaymentMethod(
    body.createQuotes,
    body.paymentMethodTokenId,
    userId,
    collection)
  .catch((err: Error) => this.throw(400, err.message));

  this.status = 201;
}

router.post(
  '/collection/:collectionId',
  requireAuth,
  canAccessCollectionInParam,
  canSubmitCollection,
  typeGuard<PayWithMethodRequest>(isPayWithMethodRequest),
  payQuoteWithMethod
);

export = router.routes();
