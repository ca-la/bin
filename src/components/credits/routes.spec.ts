import * as Knex from 'knex';

import * as API from '../../test-helpers/http';
import * as db from '../../services/db';
import createUser = require('../../test-helpers/create-user');
import { addCredit } from './dao';
import { test, Test } from '../../test-helpers/fresh';

test('GET /credits returns credit amount', async (t: Test) => {
  const { session, user } = await createUser();

  await db.transaction(async (trx: Knex.Transaction) => {
    await addCredit({
      amountCents: 12345,
      createdBy: user.id,
      description: 'For being a good customer',
      expiresAt: null,
      givenTo: user.id
    }, trx);
  });

  const [response, body] = await API.get(`/credits?userId=${user.id}`, {
    headers: API.authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.deepEqual(
    body,
    { creditAmountCents: 12345 }
  );
});
