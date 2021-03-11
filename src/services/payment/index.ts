import Knex from "knex";
import uuid = require("node-uuid");
import rethrow = require("pg-rethrow");

import * as InvoicesDAO from "../../dao/invoices";
import * as LineItemsDAO from "../../dao/line-items";
import filterError = require("../../services/filter-error");
import InvalidDataError = require("../../errors/invalid-data");
import payInvoice = require("../../services/pay-invoice");
import {
  findMinimalByIds,
  ProductDesignMinimalRow,
} from "../../components/product-designs/dao/dao";
import spendCredit from "../../components/credits/spend-credit";
import createPaymentMethod from "../../components/payment-methods/create-payment-method";
import { PricingQuote } from "../../domain-objects/pricing-quote";
import { setApprovalStepsDueAtByPricingQuote } from "../../components/approval-steps/service";
import {
  CreateQuotePayload,
  generateFromPayloadAndUser as createQuotes,
} from "../../services/generate-pricing-quote";
import CollectionDb from "../../components/collections/domain-object";
import Invoice = require("../../domain-objects/invoice");
import LineItem from "../../domain-objects/line-item";
import createDesignPaymentLocks from "./create-design-payment-locks";
import { logServerError, time, timeLog, timeEnd } from "../../services/logger";

type CreateRequest = CreateQuotePayload[];

export function isCreateRequest(body: any): body is CreateRequest {
  return (
    body instanceof Array &&
    body.every(
      (payload: any) =>
        typeof payload.designId === "string" &&
        typeof payload.units === "number"
    )
  );
}

function createInvoice(
  designNames: string[],
  collectionName: string,
  collectionId: string,
  totalCents: number,
  userId: string,
  invoiceAddressId: string | null,
  trx: Knex.Transaction
): Promise<Invoice> {
  return InvoicesDAO.createTrx(trx, {
    collectionId,
    description: `Payment for designs: ${designNames.join(", ")}`,
    title: `Collection: ${collectionName}`,
    totalCents,
    userId,
    invoiceAddressId,
  });
}

function createLineItems(
  quotes: PricingQuote[],
  invoiceId: string,
  trx: Knex.Transaction
): Promise<LineItem> {
  return LineItemsDAO.createAll(
    trx,
    quotes.map((quote: PricingQuote) => ({
      createdAt: new Date(),
      description: "Design Production",
      designId: quote.designId,
      id: uuid.v4(),
      invoiceId,
      quoteId: quote.id,
      title: quote.designId || "",
    }))
  )
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.UniqueViolation,
        (err: typeof rethrow.ERRORS.UniqueViolation) => {
          if (err.constraint === "one_line_item_per_design") {
            logServerError(err);
            throw new InvalidDataError("Design has already been paid for");
          }
          throw err;
        }
      )
    );
}

const getDesignNames = async (quotes: PricingQuote[]): Promise<string[]> => {
  const designIds = quotes.reduce(
    (acc: string[], quote: PricingQuote) =>
      quote.designId ? [...acc, quote.designId] : acc,
    []
  );
  const designs = await findMinimalByIds(designIds);
  return designs.map((design: ProductDesignMinimalRow) => design.title);
};

const getQuoteTotal = (quotes: PricingQuote[]): number => {
  return quotes
    .map((quote: PricingQuote) => quote.units * quote.unitCostCents)
    .reduce((total: number, current: number) => total + current, 0);
};

async function processQuotesAfterInvoice(
  trx: Knex.Transaction,
  invoiceId: string,
  quotes: PricingQuote[]
): Promise<void> {
  await createLineItems(quotes, invoiceId, trx);
  for (const quote of quotes) {
    await setApprovalStepsDueAtByPricingQuote(trx, quote);
  }
}

/**
 * This Function enables a user to generate quotes and pay them in one step.
 * It will:
 *  1. create a paymentMethod for the stripe payment token
 *  2. create the quotes for the designs and unit amounts
 *  3. create an invoice for the total amount on the collection
 *  4. create lineItems for each design
 *  5. pay the invoice
 */
export default async function payInvoiceWithNewPaymentMethod(
  trx: Knex.Transaction,
  quoteRequests: CreateRequest,
  paymentMethodTokenId: string,
  userId: string,
  collection: CollectionDb,
  invoiceAddressId: string | null
): Promise<{ invoice: Invoice; nonCreditPaymentAmount: number }> {
  try {
    time("payInvoiceWithNewPaymentMethod");
    await createDesignPaymentLocks(trx, quoteRequests);
    timeLog("payInvoiceWithNewPaymentMethod", "createDesignPaymentLocks");

    const paymentMethod = await createPaymentMethod({
      token: paymentMethodTokenId,
      userId,
      trx,
    });
    timeLog("payInvoiceWithNewPaymentMethod", "createPaymentMethod");
    const quotes: PricingQuote[] = await createQuotes(
      quoteRequests,
      userId,
      trx
    );
    timeLog("payInvoiceWithNewPaymentMethod", "createQuotes");

    const designNames = await getDesignNames(quotes);
    timeLog("payInvoiceWithNewPaymentMethod", "designNames");
    const collectionName = collection.title || "Untitled";
    const totalCents = getQuoteTotal(quotes);
    const invoice = await createInvoice(
      designNames,
      collectionName,
      collection.id,
      totalCents,
      userId,
      invoiceAddressId,
      trx
    );
    timeLog("payInvoiceWithNewPaymentMethod", "createInvoice");

    await processQuotesAfterInvoice(trx, invoice.id, quotes);
    timeLog("payInvoiceWithNewPaymentMethod", "processQuotesAfterInvoice");

    const paidInvoice = payInvoice(invoice.id, paymentMethod.id, userId, trx);
    timeLog("payInvoiceWithNewPaymentMethod", "payInvoice");

    timeEnd("payInvoiceWithNewPaymentMethod");
    return paidInvoice;
  } catch (err) {
    timeEnd("payInvoiceWithNewPaymentMethod");
    throw err;
  }
}

export async function payWaivedQuote(
  trx: Knex.Transaction,
  quoteRequests: CreateRequest,
  userId: string,
  collection: CollectionDb,
  invoiceAddressId: string | null,
  trackTimeCallback: (
    event: string,
    callback: () => Promise<any>
  ) => Promise<any>
): Promise<Invoice> {
  try {
    await trackTimeCallback("createDesignPaymentLocks", () =>
      createDesignPaymentLocks(trx, quoteRequests)
    );

    const quotes: PricingQuote[] = await trackTimeCallback("createQuotes", () =>
      createQuotes(quoteRequests, userId, trx)
    );
    const designNames = await trackTimeCallback("getDesignNames", () =>
      getDesignNames(quotes)
    );
    const collectionName = collection.title || "Untitled";

    const totalCents = getQuoteTotal(quotes);

    const invoice = await trackTimeCallback("createInvoice", () =>
      createInvoice(
        designNames,
        collectionName,
        collection.id,
        totalCents,
        userId,
        invoiceAddressId,
        trx
      )
    );

    const spentResult = await trackTimeCallback("spendCredit", () =>
      spendCredit(userId, invoice, trx)
    );

    if (spentResult.nonCreditPaymentAmount) {
      throw new InvalidDataError(
        "Cannot waive payment for amounts greater than $0"
      );
    }

    await trackTimeCallback("processQuotesAfterInvoice", () =>
      processQuotesAfterInvoice(trx, invoice.id, quotes)
    );

    const invoiceFound = await trackTimeCallback("findInvoice", () =>
      InvoicesDAO.findByIdTrx(trx, invoice.id)
    );
    return invoiceFound;
  } catch (err) {
    throw err;
  }
}
