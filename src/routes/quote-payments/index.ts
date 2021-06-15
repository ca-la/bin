import Router from "koa-router";

import filterError from "../../services/filter-error";
import InvalidDataError from "../../errors/invalid-data";
import StripeError from "../../errors/stripe";
import requireAuth = require("../../middleware/require-auth");
import {
  canAccessCollectionInRequestBody,
  canCheckOutCollection,
} from "../../middleware/can-access-collection";
import { typeGuard } from "../../middleware/type-guard";
import payInvoiceWithNewPaymentMethod, {
  isCreateRequest,
  payWaivedQuote,
} from "../../services/payment";
import { CreateQuotePayload } from "../../services/generate-pricing-quote";
import { hasProperties } from "../../services/require-properties";
import { createFromAddress } from "../../dao/invoice-addresses";
import { transitionCheckoutState } from "../../services/approval-step-state";
import useTransaction from "../../middleware/use-transaction";
import Invoice from "../../domain-objects/invoice";
import { trackEvent, trackTime } from "../../middleware/tracking";
import { sendMessage as sendApiWorkerMessage } from "../../workers/api-worker/send-message";

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

function* payQuote(
  this: TrxContext<
    AuthedContext<PayRequest | PayWithMethodRequest, CollectionsKoaState>
  >
): Iterator<any, any, any> {
  const { body } = this.request;
  const { isWaived } = this.query;
  const { userId, collection, trx } = this.state;
  const trackEventPrefix = "quotePayments/payQuote";
  if (!collection) {
    this.throw(403, "Unable to access collection");
  }
  trackEvent(this, `${trackEventPrefix}/BEGIN`, {
    body,
    userId,
    collectionId: collection.id,
    isWaived,
  });
  const trackQuotePaymentTime = (event: string, callback: () => Promise<any>) =>
    trackTime(this, `quotePayment/handleQuotePayment/${event}`, callback);

  const invoiceAddressId = body.addressId
    ? (yield createFromAddress(trx, body.addressId)).id
    : null;

  let invoice: Invoice;
  let paymentAmountCents = 0;
  if (isWaived) {
    invoice = yield trackTime(this, `${trackEventPrefix}/payWaivedQuote`, () =>
      payWaivedQuote(
        trx,
        body.createQuotes,
        userId,
        collection,
        invoiceAddressId,
        trackQuotePaymentTime
      ).catch(
        filterError(InvalidDataError, (err: InvalidDataError) =>
          this.throw(400, err.message)
        )
      )
    );
  } else if (isPayWithMethodRequest(body)) {
    const { invoice: paidInvoice, nonCreditPaymentAmount } = yield trackTime(
      this,
      `${trackEventPrefix}/payInvoiceWithNewPaymentMethod`,
      () =>
        payInvoiceWithNewPaymentMethod(
          trx,
          body.createQuotes,
          body.paymentMethodTokenId,
          userId,
          collection,
          invoiceAddressId
        ).catch((err: Error) => {
          if (err instanceof InvalidDataError || err instanceof StripeError) {
            this.throw(400, err.message);
          }
          throw err;
        })
    );

    invoice = paidInvoice;
    paymentAmountCents = nonCreditPaymentAmount;
  } else {
    this.throw("Request must match type");
  }

  yield transitionCheckoutState(trx, collection.id);

  yield trackTime(this, `${trackEventPrefix}/postProcessQuoteInApiWorker`, () =>
    sendApiWorkerMessage({
      type: "POST_PROCESS_QUOTE_PAYMENT",
      deduplicationId: invoice.id,
      keys: {
        invoiceId: invoice.id,
        userId,
        collectionId: collection.id,
        paymentAmountCents,
      },
    })
  );

  this.body = invoice;
  this.status = 201;
}

router.post(
  "/",
  requireAuth,
  canAccessCollectionInRequestBody,
  useTransaction,
  canCheckOutCollection,
  typeGuard<PayRequest | PayWithMethodRequest>(isPayRequest),
  payQuote
);

export = router.routes();
