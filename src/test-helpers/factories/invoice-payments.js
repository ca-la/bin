'use strict';

const db = require('../../services/db');
const createUser = require('../create-user');
const PaymentMethodsDAO = require('../../dao/payment-methods');
const ProductDesignsDAO = require('../../dao/product-designs');
const InvoicesDAO = require('../../dao/invoices');
const InvoicePaymentsDAO = require('../../dao/invoice-payments');

async function createInvoicesWithPayments() {
  const { user } = await createUser({ withSession: false });
  const paymentMethod = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: 'stripe-test-user',
    stripeSourceId: 'stripe-test-source',
    lastFourDigits: 1111
  });
  const design = await ProductDesignsDAO.create({ userId: user.id });

  const { user: user2 } = await createUser();
  const design2 = await ProductDesignsDAO.create({ userId: user2.id });

  let createdInvoices;
  let createdPayments;

  await db.transaction(async (trx) => {
    createdInvoices = await Promise.all([
      InvoicesDAO.createTrx(trx, {
        designId: design.id,
        totalCents: 1234,
        title: 'My Development Invoice',
        designStatusId: 'NEEDS_DEVELOPMENT_PAYMENT'
      }),
      InvoicesDAO.createTrx(trx, {
        designId: design.id,
        totalCents: 4321,
        title: 'My Pre-production Invoice',
        designStatusId: 'NEEDS_PRODUCTION_PAYMENT'
      }),
      InvoicesDAO.createTrx(trx, {
        designId: design2.id,
        totalCents: 3214,
        title: 'My Development Invoice',
        designStatusId: 'NEEDS_DEVELOPMENT_PAYMENT'
      }),
      InvoicesDAO.createTrx(trx, {
        designId: design.id,
        totalCents: 1234,
        title: 'My Development Invoice',
        designStatusId: 'NEEDS_DEVELOPMENT_PAYMENT'
      })
    ]);

    createdPayments = await Promise.all([
      InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: createdInvoices[0].id,
        totalCents: createdInvoices[0].totalCents,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: 'test-stripe-charge'
      }),
      InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: createdInvoices[1].id,
        totalCents: 100,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: 'test-stripe-charge-2'
      })
    ]);
  });

  return {
    users: [user, user2],
    designs: [design, design2],
    paymentMethod,
    createdInvoices,
    createdPayments
  };
}

module.exports = {
  createInvoicesWithPayments
};
