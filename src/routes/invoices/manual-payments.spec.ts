import createUser = require('../../test-helpers/create-user');
import { authHeader, post } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';
import generateInvoice from '../../test-helpers/factories/invoice';
import * as InvoicesDAO from '../../dao/invoices';
import * as InvoicePaymentsDAO from '../../components/invoice-payments/dao';

test('/invoices/:invoiceId/manual-payments POST generates invoice payment',
async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });

  const { invoice } = await generateInvoice({ userId: user.id });

  t.equal(invoice.isPaid, false, 'invoice is not paid');

  const [postResponse, body] = await post(`/invoices/${invoice.id}/manual-payments`, {
    body: {
      resolvePaymentId: 'test-resolve-payment-id',
      userId: user.id
    },
    headers: authHeader(session.id)
  });

  const invoiceAfter = await InvoicesDAO.findById(invoice.id);
  const invoicePayments = await InvoicePaymentsDAO.findByInvoiceId(invoice.id);
  const invoicePayment = invoicePayments[0];

  t.equal(postResponse.status, 201, 'successfully creates the invoice payment');
  t.equal(invoiceAfter.isPaid, true, 'invoice is paid');
  t.equal(invoicePayment.invoiceId, invoice.id, 'invoice payment is for correct invoice');
  t.equal(invoicePayment.invoiceId, body.invoiceId, 'invoice payment is returned by the endpoint');
  t.equal(invoicePayment.totalCents, invoice.totalCents, 'payment is for full invoice amount');
});