import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import * as API from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');

const API_PATH = '/access-control';

test(`GET ${API_PATH}/notifications checks access`, async (t: tape.Test) => {
  const userOne = await createUser();
  const userTwo = await createUser();

  const [response1] = await API.get(`${API_PATH}/notifications?userId=${userTwo.user.id}`, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response1.status, 200);

  const [response2] = await API.get(`${API_PATH}/notifications?userId=${userOne.user.id}`, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response2.status, 400);

  const [response3] = await API.get(`${API_PATH}/notifications?userId=abc-123`, {
    headers: API.authHeader(userTwo.session.id)
  });
  t.equal(response3.status, 400);
});
