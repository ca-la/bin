import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import InvoicePaymentsDAO = require('../../dao/invoice-payments');
import InvoicesDAO = require('../../dao/invoices');
import ProductDesignsDAO = require('../../dao/product-designs');
import ProductDesignVariantsDAO = require('../../dao/product-design-variants');
import ProductDesignsStatusUpdatesDAO = require('../../dao/product-design-status-updates');
import createUser = require('../../test-helpers/create-user');
import db = require('../../services/db');
import { authHeader, get } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';

test('GET /kpis returns realistic values for each number', async (t: Test) => {
  const { session: adminSession } = await createUser({ role: 'ADMIN' });

  const [response, body] = await get('/kpis?startDate=1970-01-01&endDate=2050-01-01', {
    headers: authHeader(adminSession.id)
  });

  t.equal(response.status, 200);
  t.equal(body.approvedDesignCount, 0);
  t.equal(body.completedDesignCount, 0);
  t.equal(body.designCount, 0);
  t.equal(body.firstTimeRepeatDesignerCount, 0);
  t.equal(body.inDevelopmentDesignCount, 0);
  t.equal(body.inProductionDesignCount, 0);
  t.equal(body.otherStatusDesignCount, 0);
  t.equal(body.paidButIncompleteDesignCount, 0);
  t.equal(body.paidDesignCount, 0);
  t.equal(body.paidDesignerCount, 0);
  t.equal(body.paidDevelopmentAmountCents, 0);
  t.equal(body.paidInvoiceAmountCents, 0);
  t.equal(body.paidProductionAmountCents, 0);
  t.equal(body.paidUnitsCount, 0);
  t.equal(body.partnerCount, 0);
  t.equal(body.productionPartnerCount, 0);
  t.equal(body.submittedDesignCount, 0);
  t.equal(body.userCount, 1);
});

test('GET /kpis returns accurate `paidButIncompleteDesignCount`', async (t: Test) => {
  const { session: adminSession, user } = await createUser({ role: 'ADMIN' });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  await ProductDesignsStatusUpdatesDAO.create({
    createdAt: '2018-01-01',
    designId: design.id,
    newStatus: 'IN_REVIEW',
    userId: user.id
  });

  await ProductDesignsStatusUpdatesDAO.create({
    createdAt: '2018-02-01',
    designId: design.id,
    newStatus: 'PRE_PRODUCTION',
    userId: user.id
  });

  await ProductDesignsStatusUpdatesDAO.create({
    createdAt: '2018-03-01',
    designId: design.id,
    newStatus: 'COMPLETE',
    userId: user.id
  });

  const body1 = (await get('/kpis?startDate=1970-01-01&endDate=2050-01-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body1.paidButIncompleteDesignCount, 0);

  const body2 = (await get('/kpis?startDate=1970-01-01&endDate=2017-01-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body2.paidButIncompleteDesignCount, 0);

  const body3 = (await get('/kpis?startDate=1970-01-01&endDate=2018-02-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body3.paidButIncompleteDesignCount, 1);
});

test('GET /kpis returns accurate `paidUnitsCount`', async (t: Test) => {
  const { session: adminSession, user } = await createUser({ role: 'ADMIN' });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  await ProductDesignVariantsDAO.replaceForDesign(design.id, [{
    colorName: 'white',
    designId: design.id,
    id: uuid.v4(),
    position: 1,
    sizeName: 'L',
    unitsToProduce: 9928
  }]);

  await db.transaction(async (trx: Knex.Transaction) => {
    const invoice = await InvoicesDAO.createTrx(trx, {
      designId: design.id,
      totalCents: 123
    });

    await InvoicePaymentsDAO.createTrx(trx, {
      invoiceId: invoice.id,
      totalCents: 123
    });
  });

  const body1 = (await get('/kpis?startDate=1970-01-01&endDate=2050-01-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body1.paidUnitsCount, 9928);

  const body2 = (await get('/kpis?startDate=1970-01-01&endDate=1970-02-01', {
    headers: authHeader(adminSession.id)
  }))[1];

  t.equal(body2.paidUnitsCount, 0);
});

test('GET /kpis returns accurate `firstTimeRepeatDesignerCount`', async (t: Test) => {
  const { session: adminSession, user } = await createUser({ role: 'ADMIN' });

  const design1 = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const invoice = await InvoicesDAO.createTrx(trx, {
      designId: design1.id,
      totalCents: 123
    });

    await InvoicePaymentsDAO.createTrx(trx, {
      createdAt: '2018-01-01',
      invoiceId: invoice.id,
      totalCents: 123
    });
  });

  const design2 = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain Blue Tee',
    userId: user.id
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const invoice = await InvoicesDAO.createTrx(trx, {
      designId: design2.id,
      totalCents: 123
    });

    await InvoicePaymentsDAO.createTrx(trx, {
      createdAt: '2018-05-01',
      invoiceId: invoice.id,
      totalCents: 123
    });
  });

  const design3 = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain Blue Tee',
    userId: user.id
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const invoice = await InvoicesDAO.createTrx(trx, {
      designId: design3.id,
      totalCents: 123
    });

    await InvoicePaymentsDAO.createTrx(trx, {
      createdAt: '2018-10-01',
      invoiceId: invoice.id,
      totalCents: 123
    });
  });

  const body1 = (await get('/kpis?startDate=1970-01-01&endDate=2018-06-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body1.firstTimeRepeatDesignerCount, 1);

  const body2 = (await get('/kpis?startDate=2018-04-01&endDate=2018-06-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body2.firstTimeRepeatDesignerCount, 1);

  const body3 = (await get('/kpis?startDate=2017-12-31&endDate=2018-02-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body3.firstTimeRepeatDesignerCount, 0);
});

test('GET /kpis returns accurate `completedDesignCount`', async (t: Test) => {
  const { session: adminSession, user } = await createUser({ role: 'ADMIN' });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  await ProductDesignsStatusUpdatesDAO.create({
    createdAt: '2018-03-01',
    designId: design.id,
    newStatus: 'COMPLETE',
    userId: user.id
  });

  const body1 = (await get('/kpis?startDate=1970-01-01&endDate=2018-01-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body1.completedDesignCount, 0);

  const body2 = (await get('/kpis?startDate=2018-02-01&endDate=2018-04-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body2.completedDesignCount, 1);

  const body3 = (await get('/kpis?startDate=2018-04-01&endDate=2050-02-01', {
    headers: authHeader(adminSession.id)
  }))[1];
  t.equal(body3.completedDesignCount, 0);
});
