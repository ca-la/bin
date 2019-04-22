import * as uuid from 'node-uuid';

import { authHeader, put } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import { omit } from 'lodash';

const API_PATH = '/approved-signups';

test(`PUT ${API_PATH}/:signupId creates an approved signup`, async (t: Test) => {
  const { session } = await createUser({ role: 'ADMIN' });
  const data = {
    createdAt: new Date('2019-01-02'),
    email: 'foo@example.com',
    firstName: 'Foo',
    id: uuid.v4(),
    lastName: 'Bar'
  };
  const [response, body] = await put(`${API_PATH}/${data.id}`, {
    body: data,
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201, 'Succeeds');
  t.deepEqual(
    omit(body, 'createdAt'),
    omit(data, 'createdAt'),
    'Returns the approved signup row'
  );

  const [failedResponse, failedBody] = await put(`${API_PATH}/${data.id}`, {
    body: { ...data, id: uuid.v4() },
    headers: authHeader(session.id)
  });
  t.equal(failedResponse.status, 400);
  t.equal(failedBody.message, 'Email is already taken');
});

test(`PUT ${API_PATH}/:signupId will fail with incomplete data`, async (t: Test) => {
  const { session } = await createUser({ role: 'ADMIN' });
  const data = {
    createdAt: new Date('2019-01-02'),
    email: 'foo@example.com',
    id: uuid.v4()
  };
  const [response, body] = await put(`${API_PATH}/${data.id}`, {
    body: data,
    headers: authHeader(session.id)
  });

  t.equal(response.status, 400, 'Fails');
  t.equal(body.message, 'Request does not match the Approved Signup properties.');
});
