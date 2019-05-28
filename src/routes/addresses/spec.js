'use strict';

const createUser = require('../../test-helpers/create-user');

const { get, post, authHeader } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

test('GET /addresses returns a 401 when called without auth', t => {
  return get('/addresses').then(([response, body]) => {
    t.equal(response.status, 401);
    t.equal(body.message, 'Authorization is required to access this resource');
  });
});

test('GET /addresses returns a 403 when called with someone elses user ID', t => {
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

test('GET /addresses returns a list of addresses', t => {
  let addressId;

  return createUser({ withAddress: true })
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

test('POST /addresses returns a 401 when called without auth', t => {
  return post('/addresses').then(([response, body]) => {
    t.equal(response.status, 401);
    t.equal(body.message, 'Authorization is required to access this resource');
  });
});

test('POST /addresses returns a 400 when called with missing data', t => {
  return createUser()
    .then(({ session }) => {
      return post('/addresses', {
        headers: authHeader(session.id),
        body: {
          companyName: '',
          addressLine1: '',
          city: '',
          region: '',
          country: '',
          postCode: ''
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, 'Missing required information: Address Line 1');
    });
});

test('POST /addresses creates and returns an address', t => {
  let userId;

  return createUser()
    .then(({ user, session }) => {
      userId = user.id;

      return post('/addresses', {
        headers: authHeader(session.id),
        body: {
          companyName: 'CALA',
          addressLine1: '42 Wallaby Way',
          city: 'Sydney',
          region: 'NSW',
          country: 'Australia',
          postCode: 'RG41 2PE'
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201);
      t.equal(body.companyName, 'CALA');
      t.equal(body.userId, userId);
    });
});
