'use strict';

const Promise = require('bluebird');

const createUser = require('../../test-helpers/create-user');
const InvalidDataError = require('../../errors/invalid-data');
const MailChimp = require('../../services/mailchimp');
const UsersDAO = require('../../dao/users');
const { post, put, authHeader } = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'user@example.com',
  zip: '94117',
  password: 'hunter2'
});

const ADDRESS_DATA = Object.freeze({
  companyName: 'CALA',
  addressLine1: '1025 Oak St',
  addressLine2: 'Apt B',
  city: 'San Francisco',
  region: 'CA',
  postCode: '94117',
  country: 'USA'
});

test('POST /users returns a 400 if user creation fails', (t) => {
  sandbox().stub(UsersDAO,
    'create',
    () => Promise.reject(new InvalidDataError('Bad email'))
  );

  return post('/users', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 400, 'status=400');
      t.equal(body.message, 'Bad email');
    });
});

test('POST /users returns new user data', (t) => {
  sandbox().stub(MailChimp, 'subscribe', () => Promise.resolve());

  return post('/users', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.name, 'Q User');
      t.equal(body.email, 'user@example.com');
      t.equal(body.password, undefined);
      t.equal(body.passwordHash, undefined);
    });
});

test('POST /users allows creating an address', (t) => {
  sandbox().stub(MailChimp, 'subscribe', () => Promise.resolve());

  const withAddress = Object.assign({}, USER_DATA, {
    address: ADDRESS_DATA
  });

  return post('/users', { body: withAddress })
    .then(([response, body]) => {
      t.equal(response.status, 201);
      t.equal(body.addresses.length, 1);
      t.equal(body.addresses[0].companyName, 'CALA');
    });
});

test('PUT /users/:id/password returns a 401 if unauthenticated', (t) => {
  return put('/users/123/password', { body: {} })
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Authorization is required to access this resource');
    });
});

test('PUT /users/:id/password returns a 403 if not the current user', (t) => {
  return createUser()
    .then(({ session }) => {
      return put('/users/123/password', {
        body: {},
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'You can only update your own user');
    });
});

test('PUT /users/:id/password updates the current user', (t) => {
  return createUser()
    .then(({ user, session }) => {
      return put(`/users/${user.id}/password`, {
        body: {
          password: 'hunter2'
        },
        headers: authHeader(session.id)
      });
    })
    .then(([response]) => {
      t.equal(response.status, 200);
    });
});
