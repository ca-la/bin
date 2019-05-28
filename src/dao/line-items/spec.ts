import * as tape from 'tape';
import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import { create, findById, findByInvoiceId } from './index';
import { createTrx as createInvoice } from '../invoices';
import db = require('../../services/db');
import LineItem from '../../domain-objects/line-item';
import Invoice from '../../domain-objects/invoice';

test('LineItems DAO supports creation/retrieval', async (t: tape.Test) => {
  const id = uuid.v4();

  const invoiceData = {
    description: 'Payment for designs',
    title: 'Collection',
    totalCents: 10
  };
  let invoice: Invoice | undefined;
  await db.transaction(async (trx: Knex.Transaction) => {
    invoice = await createInvoice(trx, invoiceData);
  });

  if (!invoice) {
    return t.fail();
  }

  const data: LineItem = {
    createdAt: new Date(),
    description: 'test',
    designId: null,
    id,
    invoiceId: invoice.id,
    quoteId: null,
    title: 'test'
  };
  const inserted = await create(data);
  const result = await findById(inserted.id);
  t.deepEqual(result, inserted, 'Returned inserted lineItem');
});

test('LineItems DAO supports retrieval by invoice id', async (t: tape.Test) => {
  const id = uuid.v4();
  const id2 = uuid.v4();

  const invoiceData = {
    description: 'Payment for designs',
    title: 'Collection',
    totalCents: 10
  };
  let invoice: Invoice | undefined;
  await db.transaction(async (trx: Knex.Transaction) => {
    invoice = await createInvoice(trx, invoiceData);
  });

  if (!invoice) {
    return t.fail();
  }

  const data: LineItem = {
    createdAt: new Date(),
    description: 'test',
    designId: null,
    id,
    invoiceId: invoice.id,
    quoteId: null,
    title: 'test'
  };
  const data2: LineItem = {
    createdAt: new Date(),
    description: 'test2',
    designId: null,
    id: id2,
    invoiceId: invoice.id,
    quoteId: null,
    title: 'test2'
  };
  const inserted = await create(data);
  const inserted2 = await create(data2);
  const result = await findByInvoiceId(invoice.id);
  t.deepEqual(result, [inserted, inserted2], 'Returned inserted lineItem');
});
