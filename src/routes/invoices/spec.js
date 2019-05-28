'use strict';

const createUser = require('../../test-helpers/create-user');
const db = require('../../services/db');
const InvoicesDAO = require('../../dao/invoices');
const generateCollection = require('../../test-helpers/factories/collection')
  .default;
const { authHeader, get } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

test('GET /invoices allows admins to list invoices for a collection', async t => {
  const { user } = await createUser({ withSession: false });
  const { session: adminSession } = await createUser({ role: 'ADMIN' });

  const { collection } = await generateCollection({ userId: user.id });

  await db.transaction(async trx => {
    await InvoicesDAO.createTrx(trx, {
      collectionId: collection.id,
      totalCents: 1234,
      title: 'My First Invoice'
    });
  });

  const [response, body] = await get(
    `/invoices?collectionId=${collection.id}`,
    {
      headers: authHeader(adminSession.id)
    }
  );

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].collectionId, collection.id);
  t.equal(body[0].totalCents, 1234);
});

test('GET /invoices lists invoices belonging to a given user', async t => {
  const { session, user } = await createUser();

  const { collection } = await generateCollection({ userId: user.id });

  await db.transaction(async trx => {
    await InvoicesDAO.createTrx(trx, {
      userId: user.id,
      collectionId: collection.id,
      totalCents: 1234,
      title: 'My First Invoice'
    });
  });

  const [response, body] = await get(`/invoices?userId=${user.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].collectionId, collection.id);
  t.equal(body[0].totalCents, 1234);
});
