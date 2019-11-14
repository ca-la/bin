import Knex from 'knex';

import API from '../../test-helpers/http';
import db from '../../services/db';
import createUser = require('../../test-helpers/create-user');
import { addCredit } from './dao';
import { test, Test } from '../../test-helpers/fresh';

test('GET /credits returns credit amount', async (t: Test) => {
  const { session, user } = await createUser();

  await db.transaction(async (trx: Knex.Transaction) => {
    await addCredit(
      {
        amountCents: 12345,
        createdBy: user.id,
        description: 'For being a good customer',
        expiresAt: null,
        givenTo: user.id
      },
      trx
    );
  });

  const [response, body] = await API.get(`/credits?userId=${user.id}`, {
    headers: API.authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.deepEqual(body, { creditAmountCents: 12345 });
});

test('POST /credits modifies the credit amount for a user', async (t: Test) => {
  const { session: adminSession } = await createUser({ role: 'ADMIN' });
  const { user: creditedUser } = await createUser({ withSession: false });

  // Add 100 dollars

  const addBody = {
    creditAmountCents: 100,
    description: 'Here is some shmoney',
    expiresAt: null,
    userId: creditedUser.id
  };
  const [response, body] = await API.post('/credits', {
    body: addBody,
    headers: API.authHeader(adminSession.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, { creditAmountCents: 100 });

  // Subtract 100 dollars

  const removeBody = {
    creditAmountCents: -100,
    description: 'Sorry you do not deserve our shmoney',
    expiresAt: null,
    userId: creditedUser.id
  };
  const [response2, body2] = await API.post('/credits', {
    body: removeBody,
    headers: API.authHeader(adminSession.id)
  });
  t.equal(response2.status, 200);
  t.deepEqual(body2, { creditAmountCents: 0 });

  // Try to go negative

  const removeBody2 = {
    creditAmountCents: -1,
    description: 'I am gonna remove even more money',
    expiresAt: null,
    userId: creditedUser.id
  };
  const [response3, body3] = await API.post('/credits', {
    body: removeBody2,
    headers: API.authHeader(adminSession.id)
  });
  t.equal(response3.status, 400);
  t.deepEqual(body3, { message: 'A user cannot have negative credit.' });
});

test('POST /credits fails for non-admins', async (t: Test) => {
  const { session, user } = await createUser();

  const requestBody = {
    creditAmountCents: 100,
    description: 'Here is some shmoney',
    expiresAt: null,
    userId: user.id
  };
  const [response] = await API.post('/credits', {
    body: requestBody,
    headers: API.authHeader(session.id)
  });
  t.equal(response.status, 403);
});
