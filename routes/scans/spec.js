'use strict';

const createUser = require('../../test-helpers/create-user');
const ScansDAO = require('../../dao/scans');
const { get, post, authHeader } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

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
      t.equal(body.isComplete, false);
    });
});

test('POST /scans can create an anonymous scan', (t) => {
  return post('/scans', {
    body: { type: 'PHOTO' }
  })
    .then(([response, body]) => {
      t.equal(response.status, 201);
      t.equal(body.userId, null);
      t.equal(body.isComplete, false);
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
  let userId;
  let sessionId;
  let scanId;

  return createUser(true)
    .then(({ user, session }) => {
      userId = user.id;
      sessionId = session.id;

      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo,
        userId: user.id
      });
    })
    .then((scan) => {
      scanId = scan.id;
      return get(`/scans?userId=${userId}`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.length, 1);
      t.equal(body[0].id, scanId);
    });
});

test('POST /scans/:id/claim returns a 400 if the scan is claimed', (t) => {
  let sessionId;

  return createUser()
    .then(({ session, user }) => {
      sessionId = session.id;
      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo,
        userId: user.id
      });
    })
    .then((scan) => {
      return post(`/scans/${scan.id}/claim`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, 'This scan has already been claimed');
    });
});

test('POST /scans/:id/claim claims and returns a scan', (t) => {
  let sessionId;
  let userId;

  return createUser()
    .then(({ session, user }) => {
      userId = user.id;
      sessionId = session.id;
      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo
      });
    })
    .then((scan) => {
      return post(`/scans/${scan.id}/claim`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.userId, userId);
    });
});
