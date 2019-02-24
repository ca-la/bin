import * as Knex from 'knex';

import * as db from '../../services/db';
import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import * as InvoicePaymentsDAO from './dao';
import generateInvoice from '../../test-helpers/factories/invoice';

test('InvoicePayments DAO supports creation and retrieval', async (t: tape.Test) => {
  const { invoice } = await generateInvoice();
  await db.transaction((trx: Knex.Transaction) => {
    return InvoicePaymentsDAO.createTrx(trx, {
      creditUserId: null,
      deletedAt: null,
      invoiceId: invoice.id,
      paymentMethodId: null,
      resolvePaymentId: 'test',
      rumbleshipPurchaseHash: null,
      stripeChargeId: null,
      totalCents: 111000
    });
  });
  const invoicePayments = await InvoicePaymentsDAO.findByInvoiceId(invoice.id);
  const invoicePayment = invoicePayments[0];

  if (!invoicePayment) { return t.fail('No invoice payment was created'); }

  t.deepEqual(invoicePayment.invoiceId, invoice.id, 'Invoice id is correct.');
  t.deepEqual(invoicePayment.resolvePaymentId, 'test', 'Payment resolve id is correct.');
  t.deepEqual(invoicePayment.totalCents, 111000, 'Payment is for correct amount.');
});
