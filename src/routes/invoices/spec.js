'use strict';

const createUser = require('../../test-helpers/create-user');
const db = require('../../services/db');
const InvoicesDAO = require('../../dao/invoices');
const ProductDesignsDAO = require('../../dao/product-designs');
const generateCollection = require('../../test-helpers/factories/collection').default;
const { authHeader, get } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

test('GET /invoices allows admins to list invoices for a design', async (t) => {
  const { user } = await createUser({ withSession: false });
  const { session: adminSession } = await createUser({ role: 'ADMIN' });

  const design = await ProductDesignsDAO.create({ userId: user.id });

  await db.transaction(async (trx) => {
    await InvoicesDAO.createTrx(trx, {
      designId: design.id,
      totalCents: 1234,
      title: 'My First Invoice',
      designStatusId: 'NEEDS_DEVELOPMENT_PAYMENT'
    });
  });

  const [response, body] = await get(`/invoices?designId=${design.id}`, {
    headers: authHeader(adminSession.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].designId, design.id);
  t.equal(body[0].totalCents, 1234);
});

test('GET /invoices allows admins to list invoices for a collection', async (t) => {
  const { user } = await createUser({ withSession: false });
  const { session: adminSession } = await createUser({ role: 'ADMIN' });

  const { collection } = await generateCollection({ userId: user.id });

  await db.transaction(async (trx) => {
    await InvoicesDAO.createTrx(trx, {
      collectionId: collection.id,
      totalCents: 1234,
      title: 'My First Invoice'
    });
  });

  const [response, body] = await get(`/invoices?collectionId=${collection.id}`, {
    headers: authHeader(adminSession.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].collectionId, collection.id);
  t.equal(body[0].totalCents, 1234);
});

test('GET /invoices allows design owner to find invoices by design & status', async (t) => {
  const { user, session } = await createUser();

  const design = await ProductDesignsDAO.create({ userId: user.id });

  await db.transaction(async (trx) => {
    await InvoicesDAO.createTrx(trx, {
      designId: design.id,
      totalCents: 1234,
      title: 'My First Invoice',
      designStatusId: 'NEEDS_DEVELOPMENT_PAYMENT'
    });

    await InvoicesDAO.createTrx(trx, {
      designId: design.id,
      totalCents: 4567,
      title: 'My First Invoice',
      designStatusId: 'NEEDS_PRODUCTION_PAYMENT'
    });
  });

  const [response, body] = await get(`/invoices?designId=${design.id}&designStatusId=NEEDS_DEVELOPMENT_PAYMENT`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].designId, design.id);
  t.equal(body[0].totalCents, 1234);
});


test('GET /invoices prevents strangers from accessing others designs', async (t) => {
  const { user } = await createUser({ withSession: false });
  const { session: session2 } = await createUser();

  const design = await ProductDesignsDAO.create({ userId: user.id });

  const [response] = await get(`/invoices?designId=${design.id}&designStatusId=NEEDS_DEVELOPMENT_PAYMENT`, {
    headers: authHeader(session2.id)
  });

  t.equal(response.status, 403);
});
