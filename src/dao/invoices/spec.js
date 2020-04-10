'use strict';

const omit = require('lodash/omit');
const uuid = require('node-uuid');
const db = require('../../services/db');
const {
  createInvoicesWithPayments,
  createInvoicesWithOverPayments
} = require('../../test-helpers/factories/invoice-payments');
const InvoicesDAO = require('.');
const { test } = require('../../test-helpers/fresh');
const generateCollection = require('../../test-helpers/factories/collection')
  .default;

test('InvoicesDAO.create', async t => {
  const { collection } = await generateCollection();

  await db.transaction(async trx => {
    const createdInvoice = await InvoicesDAO.createTrx(trx, {
      collectionId: collection.id,
      totalCents: 1234,
      title: 'My Development Invoice'
    });

    t.true(
      createdInvoice.shortId.length >= 8,
      'The created invoice has a shortId'
    );
  });
});

test(
  'InvoicesDAO.findById',
  async (t, { collections, createdInvoices, createdPayments }) => {
    const paidInvoice = await InvoicesDAO.findById(createdInvoices[0].id);
    t.deepEqual(
      omit(paidInvoice, 'shortId'),
      {
        id: createdInvoices[0].id,
        collectionId: collections[0].id,
        createdAt: createdInvoices[0].createdAt,
        deletedAt: null,
        description: null,
        designId: null,
        designStatusId: null,
        totalCents: 1234,
        totalPaid: 1234,
        isPaid: true,
        paidAt: createdPayments[0].createdAt,
        userId: null,
        title: 'My Development Invoice'
      },
      'returns an existing invoice'
    );

    const unpaidInvoice = await InvoicesDAO.findById(createdInvoices[2].id);
    t.deepEqual(
      omit(unpaidInvoice, 'shortId'),
      {
        id: createdInvoices[2].id,
        collectionId: collections[1].id,
        createdAt: createdInvoices[2].createdAt,
        deletedAt: null,
        description: null,
        designId: null,
        designStatusId: null,
        totalCents: 3214,
        totalPaid: 0,
        isPaid: false,
        paidAt: null,
        userId: null,
        title: 'My Development Invoice'
      },
      'returns an existing invoice'
    );

    const nonValidIdInvoice = await InvoicesDAO.findById(uuid.v4());
    t.equal(nonValidIdInvoice, null, 'returns null for non-existent IDs');
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.findById',
  async (t, { collections, createdInvoices, createdPayments }) => {
    const paidInvoice = await InvoicesDAO.findById(createdInvoices[0].id);
    t.deepEqual(
      omit(paidInvoice, 'shortId'),
      {
        id: createdInvoices[0].id,
        collectionId: collections[0].id,
        createdAt: createdInvoices[0].createdAt,
        deletedAt: null,
        description: null,
        designId: null,
        designStatusId: null,
        totalCents: 1234,
        totalPaid: 2234,
        isPaid: true,
        paidAt: createdPayments[0].createdAt,
        userId: null,
        title: 'My Development Invoice'
      },
      'returns an existing invoice'
    );

    const unpaidInvoice = await InvoicesDAO.findById(createdInvoices[2].id);
    t.deepEqual(
      omit(unpaidInvoice, 'shortId'),
      {
        id: createdInvoices[2].id,
        collectionId: collections[1].id,
        createdAt: createdInvoices[2].createdAt,
        deletedAt: null,
        description: null,
        designId: null,
        designStatusId: null,
        totalCents: 3214,
        totalPaid: 0,
        isPaid: false,
        paidAt: null,
        userId: null,
        title: 'My Development Invoice'
      },
      'returns an existing invoice'
    );

    const nonValidIdInvoice = await InvoicesDAO.findById(uuid.v4());
    t.equal(nonValidIdInvoice, null, 'returns null for non-existent IDs');
  },
  createInvoicesWithOverPayments
);

test(
  'InvoicesDAO.findByCollection',
  async (t, { createdInvoices, collections }) => {
    const invoices = await InvoicesDAO.findByCollection(collections[0].id);
    const invoicesForFirstCollection = createdInvoices.filter(
      i => i.collectionId === collections[0].id
    );

    t.deepEqual(
      invoices.map(i => i.id).sort(),
      invoicesForFirstCollection.map(i => i.id).sort(),
      'returns all invoices associated with a collection'
    );
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.findByUser',
  async (t, { createdInvoices, users }) => {
    const invoices = await InvoicesDAO.findByUser(users[0].id);
    t.deepEqual(
      invoices.map(i => i.id).sort(),
      createdInvoices
        .filter(i => i.userId === users[0].id)
        .map(i => i.id)
        .sort(),
      'returns all invoices associated with a user'
    );

    const notFoundInvoices = await InvoicesDAO.findByUser(uuid.v4());
    t.deepEqual(
      notFoundInvoices,
      [],
      'returns an empty array when no invoices match'
    );
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.findByUserAndUnpaid',
  async (t, { createdInvoices, users }) => {
    const invoices = await InvoicesDAO.findByUserAndUnpaid(users[0].id);
    t.deepEqual(
      invoices.map(i => i.id).sort(),
      createdInvoices
        .filter(i => i.userId === users[0].id && i.paid_at === false)
        .map(i => i.id)
        .sort(),
      'returns all invoices associated with a user'
    );

    const notFoundInvoices = await InvoicesDAO.findByUser(uuid.v4());
    t.deepEqual(
      notFoundInvoices,
      [],
      'returns an empty array when no invoices match'
    );
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.update',
  async (t, { createdInvoices }) => {
    await InvoicesDAO.update(createdInvoices[0].id, { totalCents: 10000 });
    const updated = await InvoicesDAO.findById(createdInvoices[0].id);
    t.equal(updated.totalCents, 10000, 'updates invoice value');
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.deleteById',
  async (t, { createdInvoices }) => {
    await InvoicesDAO.deleteById(createdInvoices[0].id);
    const deleted = await InvoicesDAO.findById(createdInvoices[0].id);
    t.equal(deleted, null, 'removes invoice from returned results');
  },
  createInvoicesWithPayments
);
