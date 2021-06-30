import Knex from "knex";
import uuid = require("node-uuid");
import rethrow = require("pg-rethrow");

import * as InvoicesDAO from "../../dao/invoices";
import * as LineItemsDAO from "../../dao/line-items";
import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import * as InvoicePaymentsDAO from "../../components/invoice-payments/dao";
import FinancingAccountsDAO from "../../components/financing-accounts/dao";
import {
  findMinimalByIds,
  ProductDesignMinimalRow,
} from "../../components/product-designs/dao/dao";
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
import { PaymentMethod } from "../../components/payment-methods/types";
import * as Stripe from "../stripe";
import { getCartDetails } from "../../components/design-quotes/service";
import {
  CartDetails,
  FinancingItem,
} from "../../components/design-quotes/types";
import { CreditsDAO, CreditType } from "../../components/credits";
import InvoiceFeesDAO from "../../components/invoice-fee/dao";
import { InvoiceFeeType } from "../../components/invoice-fee/types";

type CreateRequest = CreateQuotePayload[];

async function payInvoice(
  cartDetails: CartDetails,
  invoice: Invoice,
  paymentMethod: PaymentMethod | null,
  userId: string,
  trx: Knex.Transaction
): Promise<Invoice> {
  const { creditAppliedCents, financingItems, dueNowCents } = cartDetails;

  if (invoice.isPaid) {
    throw new InvalidDataError("This invoice is already paid");
  }
  // We acquire an update lock on the relevant invoice row to make sure we can
  // only be in the process of paying for one invoice at a given time.
  await trx.raw("select * from invoices where id = ? for update", [invoice.id]);

  if (creditAppliedCents > 0) {
    const credit = await CreditsDAO.create(trx, {
      type: CreditType.REMOVE,
      createdBy: userId,
      givenTo: userId,
      creditDeltaCents: -creditAppliedCents,
      description: `Spent credits on invoice ${invoice.id}`,
      expiresAt: null,
      financingAccountId: null,
    });
    await InvoicePaymentsDAO.createTrx(trx, {
      creditUserId: userId,
      creditTransactionId: credit.id,
      deletedAt: null,
      invoiceId: invoice.id,
      paymentMethodId: null,
      resolvePaymentId: null,
      rumbleshipPurchaseHash: null,
      stripeChargeId: null,
      totalCents: creditAppliedCents,
    });
  }

  if (financingItems.length > 0) {
    for (const {
      accountId,
      financedAmountCents,
      feeAmountCents,
    } of financingItems) {
      const totalFinancedCents = financedAmountCents + feeAmountCents;
      const financingCredit = await CreditsDAO.create(trx, {
        type: CreditType.REMOVE,
        createdBy: userId,
        givenTo: null,
        creditDeltaCents: -totalFinancedCents,
        description: `Financing on invoice ${invoice.id}`,
        expiresAt: null,
        financingAccountId: accountId,
      });
      const financingAccount = await FinancingAccountsDAO.findById(
        trx,
        accountId
      );
      if (!financingAccount || financingAccount.availableBalanceCents < 0) {
        // This should be blocked by the service that calculates the
        // `financingItems` but adding this safety check here
        throw new Error("Attempting to finance with no available financing");
      }

      await InvoicePaymentsDAO.createTrx(trx, {
        creditUserId: null,
        creditTransactionId: financingCredit.id,
        deletedAt: null,
        invoiceId: invoice.id,
        paymentMethodId: null,
        resolvePaymentId: null,
        rumbleshipPurchaseHash: null,
        stripeChargeId: null,
        totalCents: totalFinancedCents,
      });
    }
  }

  if (dueNowCents > 0) {
    if (paymentMethod === null) {
      throw new InvalidDataError(
        "Missing paymentMethod for invoice with payment due now"
      );
    }

    const charge = await Stripe.charge({
      customerId: paymentMethod.stripeCustomerId,
      sourceId: paymentMethod.stripeSourceId,
      amountCents: dueNowCents,
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
      totalCents: dueNowCents,
      creditUserId: null,
      creditTransactionId: null,
      deletedAt: null,
      resolvePaymentId: null,
      rumbleshipPurchaseHash: null,
    });
  }

  const paidInvoice = await InvoicesDAO.findByIdTrx(trx, invoice.id);

  if (!paidInvoice) {
    throw new Error("There was a problem when retrieving the paid invoice");
  }

  return paidInvoice;
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

async function createInvoice(
  designNames: string[],
  collectionName: string,
  collectionId: string,
  totalCents: number,
  userId: string,
  invoiceAddressId: string | null,
  trx: Knex.Transaction
): Promise<Invoice> {
  const created = await InvoicesDAO.createTrx(trx, {
    collectionId,
    description: `Payment for designs: ${designNames.join(", ")}`,
    title: `Collection: ${collectionName}`,
    totalCents,
    userId,
    invoiceAddressId,
  });

  if (!created) {
    throw new Error("There was a problem when creating the invoice");
  }

  return created;
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

async function createFees(
  trx: Knex.Transaction,
  invoiceId: string,
  cartDetails: CartDetails
) {
  const fees = cartDetails.financingItems.map((item: FinancingItem) => ({
    createdAt: new Date(),
    deletedAt: null,
    description: `Account ID: ${item.accountId}`,
    id: uuid.v4(),
    invoiceId,
    title: "Financing fee",
    totalCents: item.feeAmountCents,
    type: InvoiceFeeType.FINANCING,
  }));

  if (fees.length > 0) {
    await InvoiceFeesDAO.createAll(trx, fees);
  }
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
  quotes: PricingQuote[],
  cartDetails: CartDetails
): Promise<void> {
  await createLineItems(quotes, invoiceId, trx);
  await createFees(trx, invoiceId, cartDetails);
  for (const quote of quotes) {
    await setApprovalStepsDueAtByPricingQuote(trx, quote);
  }
}

export default async function createAndPayInvoice(
  trx: Knex.Transaction,
  quoteRequests: CreateRequest,
  paymentMethodTokenId: string | null | undefined,
  userId: string,
  collection: CollectionDb,
  invoiceAddressId: string | null
): Promise<Invoice> {
  try {
    time("createAndPayInvoice");
    await createDesignPaymentLocks(trx, quoteRequests);
    timeLog("createAndPayInvoice", "createDesignPaymentLocks");

    const cartDetails = await getCartDetails(trx, quoteRequests, userId);
    const { dueNowCents, dueLaterCents, creditAppliedCents } = cartDetails;

    let paymentMethod: PaymentMethod | null = null;
    if (dueNowCents > 0) {
      if (!paymentMethodTokenId) {
        throw new InvalidDataError(
          "Cannot find Stripe payment method token for invoice with balance due"
        );
      }

      paymentMethod = await createPaymentMethod({
        token: paymentMethodTokenId,
        userId,
        teamId: null,
        trx,
      });
      timeLog("createAndPayInvoice", "createPaymentMethod");
    }
    const quotes: PricingQuote[] = await createQuotes(
      quoteRequests,
      userId,
      trx
    );
    timeLog("createAndPayInvoice", "createQuotes");

    const designNames = await getDesignNames(quotes);
    timeLog("createAndPayInvoice", "designNames");
    const collectionName = collection.title || "Untitled";
    const invoiceTotal = dueNowCents + dueLaterCents + creditAppliedCents;
    const invoice = await createInvoice(
      designNames,
      collectionName,
      collection.id,
      invoiceTotal,
      userId,
      invoiceAddressId,
      trx
    );
    timeLog("createAndPayInvoice", "createInvoice");

    await processQuotesAfterInvoice(trx, invoice.id, quotes, cartDetails);
    timeLog("createAndPayInvoice", "processQuotesAfterInvoice");

    const paidInvoice = await payInvoice(
      cartDetails,
      invoice,
      paymentMethod,
      userId,
      trx
    );
    timeLog("createAndPayInvoice", "payInvoice");

    timeEnd("createAndPayInvoice");
    return paidInvoice;
  } catch (err) {
    timeEnd("createAndPayInvoice");
    throw err;
  }
}
