import Knex from "knex";
import uuid = require("node-uuid");
import rethrow = require("pg-rethrow");

import * as InvoicesDAO from "../../dao/invoices";
import * as LineItemsDAO from "../../dao/line-items";
import filterError = require("../../services/filter-error");
import InvalidDataError = require("../../errors/invalid-data");
import * as InvoicePaymentsDAO from "../../components/invoice-payments/dao";
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
  createQuotes,
} from "../../services/generate-pricing-quote";
import CollectionDb from "../../components/collections/domain-object";
import Invoice = require("../../domain-objects/invoice");
import LineItem from "../../domain-objects/line-item";
import createDesignPaymentLocks from "./create-design-payment-locks";
import { logServerError, time, timeLog, timeEnd } from "../../services/logger";
import { DesignQuoteLineItem } from "../../published-types";
import { CreditsDAO } from "../../components/credits";
import { PaymentMethod } from "../../components/payment-methods/types";
import * as Stripe from "../stripe";

type CreateRequest = CreateQuotePayload[];

async function payInvoice(
  creditAppliedCents: number,
  invoice: Invoice,
  paymentMethod: PaymentMethod,
  userId: string,
  trx: Knex.Transaction
) {
  // We acquire an update lock on the relevant invoice row to make sure we can
  // only be in the process of paying for one invoice at a given time.
  await trx.raw("select * from invoices where id = ? for update", [invoice.id]);

  if (invoice.isPaid) {
    throw new InvalidDataError("This invoice is already paid");
  }

  const { nonCreditPaymentAmount } = await spendCredit(
    creditAppliedCents,
    userId,
    invoice,
    trx
  );

  if (nonCreditPaymentAmount > 0) {
    const charge = await Stripe.charge({
      customerId: paymentMethod.stripeCustomerId,
      sourceId: paymentMethod.stripeSourceId,
      amountCents: nonCreditPaymentAmount,
      description:
        invoice.title ||
        invoice.collectionId ||
        invoice.description ||
        invoice.id,
      invoiceId: invoice.id,
    });

    await InvoicePaymentsDAO.createTrx(trx, {
      invoiceId: invoice.id,
      paymentMethodId: paymentMethod.id,
      stripeChargeId: charge.id,
      totalCents: nonCreditPaymentAmount,
      creditUserId: null,
      deletedAt: null,
      resolvePaymentId: null,
      rumbleshipPurchaseHash: null,
    });
  }

  return {
    invoice: await InvoicesDAO.findByIdTrx(trx, invoice.id),
    nonCreditPaymentAmount,
  };
}

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

// TODO: Promote this to a real component and drive the UI with it
async function getCartDetails(
  trx: Knex.Transaction,
  quoteRequests: CreateRequest,
  userId: string
) {
  const quotes: PricingQuote[] = await createQuotes(quoteRequests, userId, trx);

  let combinedLineItems: DesignQuoteLineItem[] = [];
  let subtotalCents = 0;
  let dueNowCents = 0;
  let totalUnits = 0;

  for (const quote of quotes) {
    const quoteCostCents = quote.unitCostCents * quote.units;
    subtotalCents += quoteCostCents;
    dueNowCents += quoteCostCents + quote.productionFeeCents;
    totalUnits += quote.units;

    if (quote.productionFeeCents > 0) {
      const existingLineItemIndex = combinedLineItems.findIndex(
        (existing: DesignQuoteLineItem) =>
          existing.description === "Production Fee"
      );
      if (existingLineItemIndex === -1) {
        combinedLineItems = [
          ...combinedLineItems,
          {
            description: "Production Fee",
            explainerCopy:
              "A fee for what you produce with us, based on your plan",
            cents: quote.productionFeeCents,
          },
        ];
      } else {
        combinedLineItems = [
          ...combinedLineItems.slice(0, existingLineItemIndex),
          {
            description: "Production Fee",
            explainerCopy:
              "A fee for what you produce with us, based on your plan",
            cents:
              combinedLineItems[existingLineItemIndex].cents +
              quote.productionFeeCents,
          },
          ...combinedLineItems.slice(existingLineItemIndex + 1),
        ];
      }
    }
  }

  let balanceDueCents = dueNowCents;
  const availableCreditCents = await CreditsDAO.getCreditAmount(userId, trx);
  const creditAppliedCents = Math.min(dueNowCents, availableCreditCents);

  if (creditAppliedCents > 0) {
    combinedLineItems = [
      ...combinedLineItems,
      {
        description: "Credit Applied",
        explainerCopy: null,
        cents: creditAppliedCents * -1,
      },
    ];
    balanceDueCents = Math.max(0, dueNowCents - creditAppliedCents);
  }

  return {
    quotes,
    combinedLineItems,
    subtotalCents,
    dueNowCents,
    dueLaterCents: 0, // Placeholder for showing financing fees, etc
    creditAppliedCents,
    balanceDueCents,
    totalUnits,
  };
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
      teamId: null,
      trx,
    });
    timeLog("payInvoiceWithNewPaymentMethod", "createPaymentMethod");
    const { quotes, dueNowCents, creditAppliedCents } = await getCartDetails(
      trx,
      quoteRequests,
      userId
    );
    timeLog("payInvoiceWithNewPaymentMethod", "createQuotes");

    const designNames = await getDesignNames(quotes);
    timeLog("payInvoiceWithNewPaymentMethod", "designNames");
    const collectionName = collection.title || "Untitled";
    const invoice = await createInvoice(
      designNames,
      collectionName,
      collection.id,
      dueNowCents,
      userId,
      invoiceAddressId,
      trx
    );
    timeLog("payInvoiceWithNewPaymentMethod", "createInvoice");

    await processQuotesAfterInvoice(trx, invoice.id, quotes);
    timeLog("payInvoiceWithNewPaymentMethod", "processQuotesAfterInvoice");

    const paidInvoice = payInvoice(
      creditAppliedCents,
      invoice,
      paymentMethod,
      userId,
      trx
    );
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

    const { quotes, dueNowCents, creditAppliedCents } = await getCartDetails(
      trx,
      quoteRequests,
      userId
    );
    const designNames = await trackTimeCallback("getDesignNames", () =>
      getDesignNames(quotes)
    );
    const collectionName = collection.title || "Untitled";

    const invoice = await trackTimeCallback("createInvoice", () =>
      createInvoice(
        designNames,
        collectionName,
        collection.id,
        dueNowCents,
        userId,
        invoiceAddressId,
        trx
      )
    );

    const spentResult = await trackTimeCallback("spendCredit", () =>
      spendCredit(creditAppliedCents, userId, invoice, trx)
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
