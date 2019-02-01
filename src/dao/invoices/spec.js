'use strict';

const uuid = require('node-uuid');
const { createInvoicesWithPayments } = require('../../test-helpers/factories/invoice-payments');
const InvoicesDAO = require('.');
const { test } = require('../../test-helpers/fresh');

test(
  'InvoicesDAO.findById',
  async (t, { createdInvoices, createdPayments }) => {
    const paidInvoice = await InvoicesDAO.findById(createdInvoices[0].id);
    t.deepEqual(
      paidInvoice,
      {
        id: createdInvoices[0].id,
        collectionId: null,
        createdAt: createdInvoices[0].createdAt,
        deletedAt: null,
        description: null,
        designId: createdInvoices[0].designId,
        designStatusId: 'NEEDS_DEVELOPMENT_PAYMENT',
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
      unpaidInvoice,
      {
        id: createdInvoices[2].id,
        collectionId: null,
        createdAt: createdInvoices[2].createdAt,
        deletedAt: null,
        description: null,
        designId: createdInvoices[2].designId,
        designStatusId: 'NEEDS_DEVELOPMENT_PAYMENT',
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
    t.equal(
      nonValidIdInvoice,
      null,
      'returns null for non-existent IDs'
    );
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.findUnpaidByDesignAndStatus',
  async (t, { designs }) => {
    const foundInvoices = await InvoicesDAO.findUnpaidByDesignAndStatus(
      designs[1].id,
      'NEEDS_DEVELOPMENT_PAYMENT'
    );
    t.equal(
      foundInvoices.every(i => !i.isPaid),
      true,
      'returned invoices are all unpaid'
    );

    const onlyPaidInvoices = await InvoicesDAO.findUnpaidByDesignAndStatus(
      designs[0].id,
      'NEEDS_DEVELOPMENT_PAYMENT'
    );
    t.equal(
      onlyPaidInvoices.every(i => !i.isPaid),
      true,
      'does not return fully paid invoices'
    );

    const notFoundInvoices = await InvoicesDAO.findUnpaidByDesignAndStatus(
      designs[0].id,
      'NEEDS_FULFILLMENT_PAYMENT'
    );
    t.deepEqual(
      notFoundInvoices,
      [],
      'returns an empty array when no invoices match'
    );

    const partiallyPaidInvoices = await InvoicesDAO.findUnpaidByDesignAndStatus(
      designs[0].id,
      'NEEDS_PRODUCTION_PAYMENT'
    );

    t.equal(
      partiallyPaidInvoices.every(i => !i.isPaid),
      true,
      'partially paid invoices are returned'
    );
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.findByDesignAndStatus',
  async (t, { designs }) => {
    const invoices = await InvoicesDAO.findByDesignAndStatus(
      designs[0].id,
      'NEEDS_DEVELOPMENT_PAYMENT'
    );
    t.equal(invoices.length, 2, 'returns all invoices');
    t.equal(
      invoices.every(i => i.designId === designs[0].id),
      true,
      'only returns invoices for a specified design'
    );
    t.equal(
      invoices.every(i => i.designStatusId === 'NEEDS_DEVELOPMENT_PAYMENT'),
      true,
      'only returns invoices for a specified status'
    );
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.findByDesign',
  async (t, { createdInvoices, designs }) => {
    const invoices = await InvoicesDAO.findByDesign(designs[0].id);
    const invoicesForFirstDesign = createdInvoices.filter(i => i.designId === designs[0].id);
    t.deepEqual(
      invoices.map(i => i.id).sort(),
      invoicesForFirstDesign.map(i => i.id).sort(),
      'returns all invoices associated with a design'
    );
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.findByCollection',
  async (t, { createdInvoices, collections }) => {
    const invoices = await InvoicesDAO.findByCollection(collections[0].id);
    const invoicesForFirstCollection = createdInvoices
      .filter(i => i.collectionId === collections[0].id);

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
  async (t, { createdInvoices, users, designs }) => {
    const invoices = await InvoicesDAO.findByUser(users[0].id);
    t.deepEqual(
      invoices.map(i => i.id).sort(),
      createdInvoices
        .filter(i => i.designId === designs[0].id)
        .map(i => i.id).sort(),
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
    t.equal(
      updated.totalCents,
      10000,
      'updates invoice value'
    );
  },
  createInvoicesWithPayments
);

test(
  'InvoicesDAO.deleteById',
  async (t, { createdInvoices }) => {
    await InvoicesDAO.deleteById(createdInvoices[0].id);
    const deleted = await InvoicesDAO.findById(createdInvoices[0].id);
    t.equal(
      deleted,
      null,
      'removes invoice from returned results'
    );
  },
  createInvoicesWithPayments
);
