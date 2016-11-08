'use strict';

const Promise = require('bluebird');

const InvalidDataError = require('../../errors/invalid-data');
const SessionsDAO = require('../../dao/sessions');
const UsersDAO = require('../../dao/users');
const { post } = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'user@example.com',
  zip: '94117',
  password: 'hunter2'
});

test('POST /sessions returns a 400 if user creation fails', (t) => {
  sandbox().stub(SessionsDAO,
    'create',
    () => Promise.reject(new InvalidDataError('Bad email'))
  );

  return post('/sessions', { body: { email: 'user@example.com', password: 'hunter2' } })
    .then(([response, body]) => {
      t.equal(response.status, 400, 'status=400');
      t.equal(body.message, 'Bad email');
    });
});

test('POST /sessions returns new session data', (t) => {
  let user;
  return UsersDAO.create(USER_DATA)
    .then((_user) => {
      user = _user;
      return post('/sessions', { body: { email: 'user@example.com', password: 'hunter2' } });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.userId, user.id);
      t.equal(body.user.passwordHash, undefined);
    });
});
