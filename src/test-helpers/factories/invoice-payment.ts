import db from '../../services/db';
import Knex from 'knex';
import uuid from 'node-uuid';

import * as InvoicesDAO from '../../dao/invoices';
import { InvoicePayment } from '../../components/invoice-payments/domain-object';
import * as InvoicePaymentsDAO from '../../components/invoice-payments/dao';
import Invoice = require('../../domain-objects/invoice');
import generateInvoice from './invoice';

interface InvoiceWithResources {
  invoice: Invoice;
  invoicePayment: InvoicePayment;
}

export default async function generateInvoicePayment(
  options: Partial<InvoicePayment> = {}
): Promise<InvoiceWithResources> {
  const { invoice } = options.invoiceId
    ? { invoice: await InvoicesDAO.findById(options.invoiceId) }
    : await generateInvoice();

  const invoicePayment = await db.transaction(
    async (trx: Knex.Transaction): Promise<InvoicePayment> => {
      return InvoicePaymentsDAO.createTrx(trx, {
        createdAt: new Date(),
        creditUserId: null,
        deletedAt: null,
        id: uuid.v4(),
        invoiceId: invoice.id,
        paymentMethodId: null,
        stripeChargeId: null,
        rumbleshipPurchaseHash: null,
        resolvePaymentId: null,
        totalCents: 1000,
        ...options
      } as InvoicePayment);
    }
  );

  return { invoice, invoicePayment };
}
