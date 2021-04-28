"use strict";

const uuid = require("node-uuid");
const db = require("../../services/db");
const createUser = require("../create-user");
const generateCollection = require("./collection").default;
const PaymentMethodsDAO = require("../../components/payment-methods/dao")
  .default;
const InvoicesDAO = require("../../dao/invoices");
const InvoicePaymentsDAO = require("../../components/invoice-payments/dao");

async function createInvoicesWithPayments() {
  const { user } = await createUser({ withSession: false });
  const paymentMethod = await db.transaction((trx) =>
    PaymentMethodsDAO.create(trx, {
      id: uuid.v4(),
      userId: user.id,
      stripeCustomerId: "stripe-test-user",
      stripeSourceId: "stripe-test-source",
      lastFourDigits: "1111",
      createdAt: new Date(),
      deletedAt: null,
      teamId: null,
    })
  );
  const { collection } = await generateCollection();
  const { collection: collection2 } = await generateCollection();

  const { user: user2 } = await createUser();

  let createdInvoices;
  let createdPayments;

  await db.transaction(async (trx) => {
    createdInvoices = await Promise.all([
      InvoicesDAO.createTrx(trx, {
        collectionId: collection.id,
        totalCents: 1234,
        title: "My Development Invoice",
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection.id,
        totalCents: 4321,
        title: "My Pre-production Invoice",
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: "My Development Invoice",
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: "My Development Invoice",
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: "My Development Invoice",
      }),
    ]);

    createdPayments = await Promise.all([
      InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: createdInvoices[0].id,
        totalCents: createdInvoices[0].totalCents,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: "test-stripe-charge",
      }),
      InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: createdInvoices[1].id,
        totalCents: 100,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: "test-stripe-charge-2",
      }),
    ]);
  });

  return {
    users: [user, user2],
    collections: [collection, collection2],
    paymentMethod,
    createdInvoices,
    createdPayments,
  };
}

async function createInvoicesWithOverPayments() {
  const { user } = await createUser({ withSession: false });
  const paymentMethod = db.transaction((trx) =>
    PaymentMethodsDAO.create(trx, {
      id: uuid.v4(),
      userId: user.id,
      stripeCustomerId: "stripe-test-user",
      stripeSourceId: "stripe-test-source",
      lastFourDigits: "1111",
      createdAt: new Date(),
      deletedAt: null,
      teamId: null,
    })
  );
  const { collection } = await generateCollection();
  const { collection: collection2 } = await generateCollection();

  const { user: user2 } = await createUser();

  let createdInvoices;
  let createdPayments;

  await db.transaction(async (trx) => {
    createdInvoices = await Promise.all([
      InvoicesDAO.createTrx(trx, {
        collectionId: collection.id,
        totalCents: 1234,
        title: "My Development Invoice",
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection.id,
        totalCents: 4321,
        title: "My Pre-production Invoice",
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: "My Development Invoice",
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: "My Development Invoice",
      }),
      InvoicesDAO.createTrx(trx, {
        collectionId: collection2.id,
        totalCents: 3214,
        title: "My Development Invoice",
      }),
    ]);

    createdPayments = await Promise.all([
      InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: createdInvoices[0].id,
        totalCents: createdInvoices[0].totalCents + 1000,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: "test-stripe-charge",
      }),
      InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: createdInvoices[1].id,
        totalCents: 100,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: "test-stripe-charge-2",
      }),
    ]);
  });

  return {
    users: [user, user2],
    collections: [collection, collection2],
    paymentMethod,
    createdInvoices,
    createdPayments,
  };
}

module.exports = {
  createInvoicesWithPayments,
  createInvoicesWithOverPayments,
};
