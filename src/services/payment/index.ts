import Knex from 'knex';
import uuid = require('node-uuid');

import db from '../../services/db';
import ProductDesignsDAO from '../../components/product-designs/dao';
import * as InvoicesDAO from '../../dao/invoices';
import * as LineItemsDAO from '../../dao/line-items';
import * as UsersDAO from '../../components/users/dao';
import * as SlackService from '../../services/slack';
import InvalidDataError = require('../../errors/invalid-data');
import payInvoice = require('../../services/pay-invoice');
import ProductDesign = require('../../components/product-designs/domain-objects/product-design');
import spendCredit from '../../components/credits/spend-credit';
import createPaymentMethod from '../../components/payment-methods/create-payment-method';
import addMargin from '../../services/add-margin';
import { PricingQuote } from '../../domain-objects/pricing-quote';
import {
  CreateQuotePayload,
  generateFromPayloadAndUser as createQuotes
} from '../../services/generate-pricing-quote';
import Collection from '../../components/collections/domain-object';
import Invoice = require('../../domain-objects/invoice');
import { FINANCING_MARGIN } from '../../config';
import LineItem from '../../domain-objects/line-item';

type CreateRequest = CreateQuotePayload[];

export function isCreateRequest(body: any): body is CreateRequest {
  return (
    body instanceof Array &&
    body.every(
      (payload: any) =>
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
  invoiceAddressId: string,
  trx: Knex.Transaction
): Promise<Invoice> {
  return InvoicesDAO.createTrx(trx, {
    collectionId,
    description: `Payment for designs: ${designNames.join(', ')}`,
    title: `Collection: ${collectionName}`,
    totalCents,
    userId,
    invoiceAddressId
  });
}

function createLineItem(
  quote: PricingQuote,
  invoiceId: string,
  trx: Knex.Transaction
): Promise<LineItem> {
  return LineItemsDAO.create(
    {
      createdAt: new Date(),
      description: 'Design Production',
      designId: quote.designId,
      id: uuid.v4(),
      invoiceId,
      quoteId: quote.id,
      title: quote.designId || ''
    },
    trx
  );
}

const getDesignNames = async (quotes: PricingQuote[]): Promise<string[]> => {
  const designIds = quotes.reduce(
    (acc: string[], quote: PricingQuote) =>
      quote.designId ? [...acc, quote.designId] : acc,
    []
  );
  const designs = await ProductDesignsDAO.findByIds(designIds);
  return designs.map((design: ProductDesign) => design.title);
};

const getQuoteTotal = (quotes: PricingQuote[]): number => {
  return quotes
    .map((quote: PricingQuote) => quote.units * quote.unitCostCents)
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
  collection: Collection,
  invoiceAddressId: string
): Promise<Invoice> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const paymentMethod = await createPaymentMethod({
      token: paymentMethodTokenId,
      userId,
      trx
    });
    const quotes: PricingQuote[] = await createQuotes(
      quoteRequests,
      userId,
      trx
    );

    const designNames = await getDesignNames(quotes);
    const collectionName = collection.title || 'Untitled';
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

    await Promise.all(
      quotes.map((quote: PricingQuote) =>
        createLineItem(quote, invoice.id, trx)
      )
    );

    return payInvoice(invoice.id, paymentMethod.id, userId, trx);
  });
}

export async function createInvoiceWithoutMethod(
  quoteRequests: CreateRequest,
  userId: string,
  collection: Collection,
  invoiceAddressId: string
): Promise<Invoice> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const quotes: PricingQuote[] = await createQuotes(
      quoteRequests,
      userId,
      trx
    );
    const designNames = await getDesignNames(quotes);
    const collectionName = collection.title || 'Untitled';

    const totalCentsWithoutFinanceMargin = getQuoteTotal(quotes);
    const totalCents = addMargin(
      totalCentsWithoutFinanceMargin,
      FINANCING_MARGIN
    );

    const invoice = await createInvoice(
      designNames,
      collectionName,
      collection.id,
      totalCents,
      userId,
      invoiceAddressId,
      trx
    );

    await spendCredit(userId, invoice, trx);

    await Promise.all(
      quotes.map((quote: PricingQuote) =>
        createLineItem(quote, invoice.id, trx)
      )
    );

    const user = await UsersDAO.findById(userId);
    await SlackService.enqueueSend({
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

export async function payWaivedQuote(
  quoteRequests: CreateRequest,
  userId: string,
  collection: Collection,
  invoiceAddressId: string
): Promise<Invoice> {
  return db.transaction(async (trx: Knex.Transaction) => {
    const quotes: PricingQuote[] = await createQuotes(
      quoteRequests,
      userId,
      trx
    );
    const designNames = await getDesignNames(quotes);
    const collectionName = collection.title || 'Untitled';

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

    const { nonCreditPaymentAmount } = await spendCredit(userId, invoice, trx);

    if (nonCreditPaymentAmount) {
      throw new InvalidDataError(
        'Cannot waive payment for amounts greater than $0'
      );
    }

    Promise.all(
      quotes.map((quote: PricingQuote) =>
        createLineItem(quote, invoice.id, trx)
      )
    );

    await SlackService.enqueueSend({
      channel: 'designers',
      params: {
        collection,
        designer: await UsersDAO.findById(userId),
        paymentAmountCents: 0
      },
      templateName: 'designer_payment'
    });

    return InvoicesDAO.findByIdTrx(trx, invoice.id);
  });
}
