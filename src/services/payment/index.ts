import * as Knex from 'knex';
import uuid = require('node-uuid');

import * as db from '../../services/db';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as InvoicesDAO from '../../dao/invoices';
import * as LineItemsDAO from '../../dao/line-items';
import * as UsersDAO from '../../dao/users';
import * as SlackService from '../../services/slack';
import spendCredit from '../../components/credits/spend-credit';
import ProductDesign = require('../../domain-objects/product-design');
import payInvoice = require('../../services/pay-invoice');
import { createPaymentMethod } from '../../services/payment-methods';
import {
  PricingQuote
} from '../../domain-objects/pricing-quote';
import {
  CreateQuotePayload,
  generateFromPayloadAndUser as createQuotes
} from '../../services/generate-pricing-quote';
import Collection from '../../domain-objects/collection';
import Invoice from '../../domain-objects/invoice';
import { FINANCING_MARGIN } from '../../config';
import LineItem from '../../domain-objects/line-item';

type CreateRequest = CreateQuotePayload[];

export function isCreateRequest(body: any): body is CreateRequest {
  return (
    body instanceof Array &&
    body.every((payload: any) =>
      typeof payload.designId === 'string' &&
      typeof payload.units === 'number'
    )
  );
}

function createInvoice(
  designNames: string[],
  collectionName: string,
  collectionId: string,
  totalCents: number,
  userId: string,
  trx: Knex.Transaction
): Promise<Invoice | undefined> {
  return InvoicesDAO.createTrx(trx, {
    collectionId,
    description: `Payment for designs: ${designNames.join(', ')}`,
    title: `Collection: ${collectionName}`,
    totalCents,
    userId
  });
}

function createLineItem(
  quote: PricingQuote,
  invoiceId: string,
  trx: Knex.Transaction
): Promise<LineItem> {
  return LineItemsDAO.create({
    createdAt: new Date(),
    description: 'Design Production',
    designId: quote.designId,
    id: uuid.v4(),
    invoiceId,
    quoteId: quote.id,
    title: quote.designId || ''
  }, trx);
}

const getDesignNames = async (quotes: PricingQuote[]): Promise<string[]> => {
  const designIds = quotes.reduce((acc: string[], quote: PricingQuote) =>
    quote.designId ? [...acc, quote.designId] : acc, []);
  const designs = await ProductDesignsDAO.findByIds(designIds);
  return designs.map((design: ProductDesign) => design.title);
};

const getQuoteTotal = (quotes: PricingQuote[]): number => {
  return quotes.map((quote: PricingQuote) => quote.units * quote.unitCostCents)
      .reduce((total: number, current: number) => total + current, 0);
};

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
  quoteRequests: CreateRequest,
  paymentMethodTokenId: string,
  userId: string,
  collection: Collection
): Promise<Invoice> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const paymentMethodId: string = await createPaymentMethod(
      paymentMethodTokenId, userId, trx);
    const quotes: PricingQuote[] = await createQuotes(quoteRequests, userId, trx);

    const designNames = await getDesignNames(quotes);
    const collectionName = collection.title || 'Untitled';
    const totalCents = getQuoteTotal(quotes);

    const invoice = await createInvoice(
      designNames, collectionName, collection.id, totalCents, userId, trx);
    if (!invoice) { throw new Error('invoice could not be created'); }
    const lineItems = await Promise.all(
      quotes.map((quote: PricingQuote) => createLineItem(quote, invoice.id, trx)));

    if (lineItems.length === 0) { throw new Error('Line items failed to create.'); }

    return payInvoice(invoice.id, paymentMethodId, userId, trx);
  });
}

export async function createInvoiceWithoutMethod(
  quoteRequests: CreateRequest,
  userId: string,
  collection: Collection
): Promise<Invoice> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const quotes: PricingQuote[] = await createQuotes(quoteRequests, userId, trx);
    const designNames = await getDesignNames(quotes);
    const collectionName = collection.title || 'Untitled';

    const totalCentsWithoutFinanceMargin = getQuoteTotal(quotes);
    const totalCents = Math.ceil(totalCentsWithoutFinanceMargin * (1 + FINANCING_MARGIN));

    const invoice = await createInvoice(
      designNames, collectionName, collection.id, totalCents, userId, trx);
    if (!invoice) { throw new Error('invoice could not be created'); }

    await spendCredit(userId, invoice, trx);

    const lineItems = await Promise.all(
      quotes.map((quote: PricingQuote) => createLineItem(quote, invoice.id, trx)));

    if (!lineItems) { throw new Error('Line items failed to create.'); }

    const user = await UsersDAO.findById(userId);
    SlackService.enqueueSend({
      channel: 'designers',
      params: {
        collection,
        designer: user,
        payLaterTotalCents: totalCents
      },
      templateName: 'designer_pay_later'
    });

    return InvoicesDAO.findByIdTrx(trx, invoice.id);
  });
}
