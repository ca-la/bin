import Router from "koa-router";

import requireAuth = require("../../middleware/require-auth");
import {
  canAccessCollectionInRequestBody,
  canSubmitCollection,
} from "../../middleware/can-access-collection";
import { typeGuard } from "../../middleware/type-guard";
import payInvoiceWithNewPaymentMethod, {
  createInvoiceWithoutMethod,
  isCreateRequest,
  payWaivedQuote,
} from "../../services/payment";
import { CreateQuotePayload } from "../../services/generate-pricing-quote";
import { hasProperties } from "../../services/require-properties";
import createUPCsForCollection from "../../services/create-upcs-for-collection";
import { createShopifyProductsForCollection } from "../../services/create-shopify-products";
import { logServerError } from "../../services/logger";
import { transitionCheckoutState } from "../../services/approval-step-state";
import { createFromAddress } from "../../dao/invoice-addresses";

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
    (hasProperties(data, "createQuotes", "collectionId") ||
      hasProperties(
        data,
        "paymentMethodTokenId",
        "createQuotes",
        "collectionId"
      )) &&
    isCreateRequest(data.createQuotes)
  );
};

const isPayWithMethodRequest = (data: any): data is PayWithMethodRequest => {
  return (
    hasProperties(
      data,
      "paymentMethodTokenId",
      "createQuotes",
      "collectionId"
    ) && isCreateRequest(data.createQuotes)
  );
};

async function handleQuotePayment(
  userId: string,
  collectionId: string
): Promise<void> {
  // TODO: move slack effect here
  //       can we just use the invoice to send the notification instead of
  //       having to send it from within the payment flow?
  // TODO: add realtime message for updating collection status
  await transitionCheckoutState(collectionId);
  await createUPCsForCollection(collectionId);
  await createShopifyProductsForCollection(
    userId,
    collectionId
  ).catch((err: Error): void =>
    logServerError(
      `Create Shopify Products for user ${userId} - Collection ${collectionId}: `,
      err
    )
  );
}

function* payQuote(
  this: AuthedContext<PayRequest | PayWithMethodRequest, CollectionsKoaState>
): Iterator<any, any, any> {
  const { body } = this.request;
  const { isFinanced, isWaived } = this.query;
  const { userId, collection } = this.state;
  if (!collection) {
    this.throw(403, "Unable to access collection");
  }

  const invoiceAddressId = body.addressId
    ? (yield createFromAddress(body.addressId)).id
    : null;

  if (isWaived) {
    this.body = yield payWaivedQuote(
      body.createQuotes,
      userId,
      collection,
      invoiceAddressId
    );
  } else if (!isFinanced && isPayWithMethodRequest(body)) {
    this.body = yield payInvoiceWithNewPaymentMethod(
      body.createQuotes,
      body.paymentMethodTokenId,
      userId,
      collection,
      invoiceAddressId
    ).catch((err: Error) => this.throw(400, err.message));
  } else if (isFinanced) {
    this.body = yield createInvoiceWithoutMethod(
      body.createQuotes,
      userId,
      collection,
      invoiceAddressId
    ).catch((err: Error) => this.throw(400, err.message));
  } else {
    this.throw("Request must match type");
  }

  yield handleQuotePayment(userId, collection.id);

  this.status = 201;
}

router.post(
  "/",
  requireAuth,
  canAccessCollectionInRequestBody,
  canSubmitCollection,
  typeGuard<PayRequest | PayWithMethodRequest>(isPayRequest),
  payQuote
);

export = router.routes();
