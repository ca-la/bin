'use strict';

const createUser = require('../../test-helpers/create-user');

const { get, authHeader } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

test('GET /addresses returns a 401 when called without a user ID', (t) => {
  return get('/addresses')
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Authorization is required to access this resource');
    });
});

test('GET /addresses returns a 403 when called with someone elses user ID', (t) => {
  return createUser()
    .then(({ session }) => {
      return get('/addresses?userId=123', {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'You can only request addresses for your own user');
    });
});

test('GET /addresses returns a list of addresses', (t) => {
  let addressId;

  return createUser(true, true)
    .then(({ user, session, address }) => {
      addressId = address.id;

      return get(`/addresses?userId=${user.id}`, {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.length, 1);
      t.equal(body[0].id, addressId);
    });
});
