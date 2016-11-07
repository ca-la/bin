'use strict';

const Promise = require('bluebird');

const InvalidDataError = require('../../errors/invalid-data');
const Session = require('../../domain-objects/session');
const SessionsDAO = require('../../dao/sessions');
const { post } = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

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
  sandbox().stub(SessionsDAO,
    'create',
    () => Promise.resolve(new Session({
      id: '1234',
      userId: '4567',
      createdAt: new Date()
    }))
  );

  return post('/sessions', { body: { email: 'user@example.com', password: 'hunter2' } })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.id, '1234');
    });
});
