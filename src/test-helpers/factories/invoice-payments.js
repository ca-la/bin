'use strict';

const db = require('../../services/db');
const createUser = require('../create-user');
const generateCollection = require('./collection').default;
const PaymentMethodsDAO = require('../../dao/payment-methods');
const InvoicesDAO = require('../../dao/invoices');
const InvoicePaymentsDAO = require('../../components/invoice-payments/dao');

async function createInvoicesWithPayments() {
  const { user } = await createUser({ withSession: false });
  const paymentMethod = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: 'stripe-test-user',
    stripeSourceId: 'stripe-test-source',
    lastFourDigits: 1111
  });
  const { collection } = await generateCollection();
  const { collection: collection2 } = await generateCollection();

  const { user: user2 } = await createUser();

  let createdInvoices;
  let createdPayments;

  await db.transaction(async trx => {
    createdInvoices = await Promise.all([
      InvoicesDAO.createTrx(trx, {
        collectionId: collection.id,
        totalCents: 1234,
        title: 'My Development Invoice'
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection.id,
        totalCents: 4321,
        title: 'My Pre-production Invoice'
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: 'My Development Invoice'
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: 'My Development Invoice'
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: 'My Development Invoice'
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
    collections: [collection, collection2],
    paymentMethod,
    createdInvoices,
    createdPayments
  };
}

module.exports = {
  createInvoicesWithPayments
};
