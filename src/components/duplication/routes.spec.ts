import * as API from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../../dao/product-designs';
import { test, Test } from '../../test-helpers/fresh';

test('POST /duplication/designs returns 400 with bad body', async (t: Test) => {
  const { session } = await createUser();

  const [response, body] = await API.post('/duplication/designs', {
    body: {
      designIds: [true]
    },
    headers: API.authHeader(session.id)
  });

  t.equal(response.status, 400);
  t.deepEqual(
    body,
    { message: 'Missing design ID list' }
  );
});

test('POST /duplication/designs returns 400 if one or more ID is invalid', async (t: Test) => {
  const { session } = await createUser();

  const [response, body] = await API.post('/duplication/designs', {
    body: {
      designIds: ['36379007-e0cc-4b9f-8a55-7785f2da61cc']
    },
    headers: API.authHeader(session.id)
  });

  t.equal(response.status, 400);
  t.deepEqual(
    body,
    { message: 'Design 36379007-e0cc-4b9f-8a55-7785f2da61cc not found' }
  );
});

test('POST /duplication/designs duplicates designs', async (t: Test) => {
  const { session, user } = await createUser();

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Green Tee',
    userId: user.id
  });

  const [response, body] = await API.post('/duplication/designs', {
    body: {
      designIds: [design.id]
    },
    headers: API.authHeader(session.id)
  });

  t.equal(response.status, 201);
  t.equal(body.length, 1);
  t.notEqual(body[0].id, design.id);
  t.equal(body[0].title, design.title);
});
