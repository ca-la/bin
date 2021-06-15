import Knex from "knex";

import db from "../../services/db";
import createUser from "../create-user";
import generateCollection from "./collection";
import InvoicesDAO from "../../dao/invoices";
import * as InvoicePaymentsDAO from "../../components/invoice-payments/dao";
import { generatePaymentMethod } from "./payment-method";

async function createInvoicesWithPayments() {
  const { user } = await createUser({ withSession: false });
  const {
    paymentMethod,
  } = await db.transaction(async (trx: Knex.Transaction) =>
    generatePaymentMethod(trx, { userId: user.id, teamId: null })
  );
  const { collection } = await generateCollection();
  const { collection: collection2 } = await generateCollection();

  const { user: user2 } = await createUser();

  let createdInvoices;
  let createdPayments;

  await db.transaction(async (trx: Knex.Transaction) => {
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
        invoiceId: createdInvoices[0]!.id,
        totalCents: createdInvoices[0]!.totalCents,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: "test-stripe-charge",
        creditUserId: null,
        creditTransactionId: null,
        deletedAt: null,
        resolvePaymentId: "test",
        rumbleshipPurchaseHash: null,
      }),
      InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: createdInvoices[1]!.id,
        totalCents: 100,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: "test-stripe-charge-2",
        creditUserId: null,
        creditTransactionId: null,
        deletedAt: null,
        resolvePaymentId: "test",
        rumbleshipPurchaseHash: null,
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
  const {
    paymentMethod,
  } = await db.transaction(async (trx: Knex.Transaction) =>
    generatePaymentMethod(trx, { userId: user.id, teamId: null })
  );
  const { collection } = await generateCollection();
  const { collection: collection2 } = await generateCollection();

  const { user: user2 } = await createUser();

  let createdInvoices;
  let createdPayments;

  await db.transaction(async (trx: Knex.Transaction) => {
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
        invoiceId: createdInvoices[0]!.id,
        totalCents: createdInvoices[0]!.totalCents + 1000,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: "test-stripe-charge",
        creditUserId: null,
        creditTransactionId: null,
        deletedAt: null,
        resolvePaymentId: "test",
        rumbleshipPurchaseHash: null,
      }),
      InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: createdInvoices[1]!.id,
        totalCents: 100,
        paymentMethodId: paymentMethod.id,
        stripeChargeId: "test-stripe-charge-2",
        creditUserId: null,
        creditTransactionId: null,
        deletedAt: null,
        resolvePaymentId: "test",
        rumbleshipPurchaseHash: null,
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
