import Router from "koa-router";
import Knex from "knex";

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
import createUPCsForCollection from "../../services/create-upcs-for-collection";
import createSKUsForCollection from "../../services/create-skus-for-collection";
import { createShopifyProductsForCollection } from "../../services/create-shopify-products";
import {
  time,
  timeLog,
  timeEnd,
  logServerError,
  logWarning,
} from "../../services/logger";
import { transitionCheckoutState } from "../../services/approval-step-state";
import { createFromAddress } from "../../dao/invoice-addresses";
import * as IrisService from "../../components/iris/send-message";
import { determineSubmissionStatus } from "../../components/collections/services/determine-submission-status";
import { realtimeCollectionStatusUpdated } from "../../components/collections/realtime";
import useTransaction from "../../middleware/use-transaction";
import * as SlackService from "../../services/slack";
import * as UsersDAO from "../../components/users/dao";
import Invoice from "../../domain-objects/invoice";
import { CollectionDb } from "../../published-types";

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

async function sendCollectionStatusUpdated(
  trx: Knex.Transaction,
  collectionId: string
): Promise<void> {
  const statusByCollectionId = await determineSubmissionStatus(
    [collectionId],
    trx
  );
  const collectionStatus = statusByCollectionId[collectionId];
  if (!collectionStatus) {
    throw new Error(`Could not get the status for collection ${collectionId}`);
  }

  await IrisService.sendMessage(
    realtimeCollectionStatusUpdated(collectionStatus)
  );
}

async function sendSlackUpdate({
  invoice,
  collection,
  paymentAmountCents,
}: {
  invoice: Invoice;
  collection: CollectionDb;
  paymentAmountCents: number;
}) {
  if (!invoice.userId) {
    throw new Error(`Invoice ${invoice.id} does not have a userId`);
  }

  const designer = await UsersDAO.findById(invoice.userId);

  const notification: SlackService.SlackBody = {
    channel: "designers",
    templateName: "designer_payment",
    params: {
      collection,
      designer,
      paymentAmountCents,
    },
  };

  await SlackService.enqueueSend(notification).catch((e: Error) => {
    logWarning(
      "There was a problem sending the payment notification to Slack",
      e
    );
  });
}

async function handleQuotePayment(
  trx: Knex.Transaction,
  userId: string,
  collectionId: string
): Promise<void> {
  await transitionCheckoutState(trx, collectionId);
  await createUPCsForCollection(trx, collectionId);
  await createSKUsForCollection(trx, collectionId);
  await createShopifyProductsForCollection(
    trx,
    userId,
    collectionId
  ).catch((err: Error): void =>
    logServerError(
      `Create Shopify Products for user ${userId} - Collection ${collectionId}: `,
      err
    )
  );
  await sendCollectionStatusUpdated(trx, collectionId);
}

function* payQuote(
  this: TrxContext<
    AuthedContext<PayRequest | PayWithMethodRequest, CollectionsKoaState>
  >
): Iterator<any, any, any> {
  time("payQuote");
  try {
    const { body } = this.request;
    const { isWaived } = this.query;
    const { userId, collection, trx } = this.state;
    if (!collection) {
      this.throw(403, "Unable to access collection");
    }
    timeLog(
      "payQuote",
      "params:",
      { userId, isWaived, collectionId: collection.id },
      "body:",
      body
    );

    const invoiceAddressId = body.addressId
      ? (yield createFromAddress(trx, body.addressId)).id
      : null;

    timeLog("payQuote", "invoiceAddressId");

    let invoice: Invoice;
    let paymentAmountCents = 0;
    if (isWaived) {
      invoice = yield payWaivedQuote(
        trx,
        body.createQuotes,
        userId,
        collection,
        invoiceAddressId
      ).catch(
        filterError(InvalidDataError, (err: InvalidDataError) =>
          this.throw(400, err.message)
        )
      );
      timeLog("payQuote", "payWaivedQuote");
    } else if (isPayWithMethodRequest(body)) {
      const {
        invoice: paidInvoice,
        nonCreditPaymentAmount,
      } = yield payInvoiceWithNewPaymentMethod(
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
      });
      invoice = paidInvoice;
      paymentAmountCents = nonCreditPaymentAmount;
      timeLog("payQuote", "payInvoiceWithNewPaymentMethod");
    } else {
      this.throw("Request must match type");
    }

    yield handleQuotePayment(trx, userId, collection.id);
    timeLog("payQuote", "handleQuotePayment");
    yield sendSlackUpdate({ invoice, collection, paymentAmountCents });
    timeLog("payQuote", "sendSlackUpdate");

    this.body = invoice;
    this.status = 201;
    timeEnd("payQuote");
  } catch (err) {
    timeEnd("payQuote");
    throw err;
  }
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
