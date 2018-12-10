import * as Knex from 'knex';
import uuid = require('node-uuid');

import * as db from '../../services/db';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as InvoicesDAO from '../../dao/invoices';
import * as LineItemsDAO from '../../dao/line-items';
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

async function createLineItem(
  quote: PricingQuote,
  invoiceId: string,
  trx: Knex.Transaction
): Promise<void> {
  await LineItemsDAO.create({
    createdAt: new Date(),
    description: 'Design Production',
    designId: quote.designId,
    id: uuid.v4(),
    invoiceId,
    quoteId: quote.id,
    title: quote.designId || ''
  }, trx);
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
  quoteRequests: CreateRequest,
  paymentMethodTokenId: string,
  userId: string,
  collection: Collection
): Promise<Invoice> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const paymentMethodId: string = await createPaymentMethod(
      paymentMethodTokenId, userId, trx);

    const quotes: PricingQuote[] = await createQuotes(quoteRequests, userId, trx);

    const designIds = quotes.reduce((acc: string[], quote: PricingQuote) =>
      quote.designId ? [...acc, quote.designId] : acc, []);

    const designs = await ProductDesignsDAO.findByIds(designIds);
    const designNames = designs.map((design: ProductDesign) => design.title);

    const collectionName = collection.title || 'Untitled';

    const totalCents = quotes
      .map((quote: PricingQuote) => quote.units * quote.unitCostCents)
      .reduce((total: number, current: number) => total + current, 0);

    const invoice = await createInvoice(
      designNames, collectionName, collection.id, totalCents, userId, trx);

    if (!invoice) { throw new Error('invoice could not be created'); }
    await Promise.all(quotes.map((quote: PricingQuote) => createLineItem(quote, invoice.id, trx)));

    return payInvoice(invoice.id, paymentMethodId, userId, trx);
  });
}
