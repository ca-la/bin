import Router from 'koa-router';

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
import { omit } from 'lodash';
import { createShopifyProductsForCollection } from '../../services/create-shopify-products';
import { logServerError } from '../../services/logger';
import { createFromAddress } from '../../dao/invoice-addresses';

const router = new Router();

interface PayRequest {
  addressId: string;
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
  this: AuthedContext<PayRequest | PayWithMethodRequest, CollectionsKoaState>
): Iterator<any, any, any> {
  const { body } = this.request;
  const { isFinanced, isWaived } = this.query;
  const { userId, collection } = this.state;
  if (!collection) {
    this.throw(403, 'Unable to access collection');
  }

  if (!body.addressId) {
    this.throw(403, 'Address is required');
  }

  // tslint:disable-next-line: no-console
  console.log(
    'body:',
    JSON.stringify(omit(body, 'paymentMethodTokenId'), null, 2)
  );

  const invoiceAddress = yield createFromAddress(body.addressId);

  if (isWaived) {
    this.body = yield payWaivedQuote(
      body.createQuotes,
      userId,
      collection,
      invoiceAddress.id
    );
  } else if (!isFinanced && isPayWithMethodRequest(body)) {
    this.body = yield payInvoiceWithNewPaymentMethod(
      body.createQuotes,
      body.paymentMethodTokenId,
      userId,
      collection,
      invoiceAddress.id
    ).catch((err: Error) => this.throw(400, err.message));
  } else if (isFinanced) {
    this.body = yield createInvoiceWithoutMethod(
      body.createQuotes,
      userId,
      collection,
      invoiceAddress.id
    ).catch((err: Error) => this.throw(400, err.message));
  } else {
    this.throw('Request must match type');
  }

  yield createUPCsForCollection(collection.id);

  createShopifyProductsForCollection(userId, collection.id).catch(
    (err: Error): void =>
      logServerError(
        `Create Shopify Products for user ${userId} - Collection ${
          collection.id
        }: `,
        err
      )
  );

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
