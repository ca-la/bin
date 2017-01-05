'use strict';

const createUser = require('../../test-helpers/create-user');
const { get, post, authHeader } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

test('POST /scans returns a 401 if not signed in', (t) => {
  return post('/scans', { body: { type: 'PHOTO' } })
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Authorization is required to access this resource');
    });
});

test('POST /scans returns a 400 if missing data', (t) => {
  return createUser()
    .then(({ session }) => {
      return post('/scans', {
        body: {},
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, 'Scan type must be provided');
    });
});

test('POST /scans returns a 201 on success', (t) => {
  let userId;
  return createUser()
    .then(({ user, session }) => {
      userId = user.id;

      return post('/scans', {
        body: { type: 'PHOTO' },
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201);
      t.equal(body.userId, userId);
    });
});

test('GET /scans returns a 401 when called without a user ID', (t) => {
  return get('/scans')
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Authorization is required to access this resource');
    });
});

test('GET /scans returns a 403 when called with someone elses user ID', (t) => {
  return createUser()
    .then(({ session }) => {
      return get('/scans?userId=123', {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'You can only request scans for your own user');
    });
});

test('GET /scans returns a list of scans', (t) => {
  return createUser(true)
    .then(({ user, session }) => {
      return get(`/scans?userId=${user.id}`, {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.length, 1);
    });
});
