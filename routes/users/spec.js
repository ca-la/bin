'use strict';

const Promise = require('bluebird');

const UsersDAO = require('../../dao/users');
const { test, sandbox } = require('../../test-helpers/fresh');
const { post } = require('../../test-helpers/http');
const InvalidDataError = require('../../errors/invalid-data');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'user@example.com',
  zip: '94117',
  password: 'hunter2'
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
  return post('/users', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.name, 'Q User');
      t.equal(body.email, 'user@example.com');
      t.equal(body.password, undefined);
      t.equal(body.passwordHash, undefined);
    });
});
