'use strict';

const UsersDAO = require('../../dao/users');
const { test } = require('../../test-helpers/fresh');
const { post } = require('../../test-helpers/http');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'user@example.com',
  zip: '94117',
  password: 'hunter2'
});

test('POST /users returns a 400 if required data is missing', (t) => {
  return post('/users', { body: {} })
    .then(([response]) => {
      t.equal(response.status, 400, 'status=400');
    });
});

test('POST /users returns a 400 if user already exists', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => post('/users', { body: USER_DATA }))
    .then(([response]) => {
      t.equal(response.status, 400, 'status=400');
    });
});

test('POST /users returns a 400 if email is invalid', (t) => {
  return post('/users', {
    body: {
      name: 'Q User',
      email: 'user at example.com',
      zip: '94117',
      password: 'hunter2'
    }
  })
    .then(([response]) => {
      t.equal(response.status, 400, 'status=400');
    });
});

test('POST /users returns new user data', (t) => {
  return post('/users', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.name, 'Q User');
      t.equal(body.email, 'user@example.com');
      t.equal(body.password, undefined);
      t.equal(body.passwordHash, undefined);
    });
});
