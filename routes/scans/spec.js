'use strict';

const createUser = require('../../test-helpers/create-user');
const Scan = require('../../domain-objects/scan');
const ScanPhotosDAO = require('../../dao/scan-photos');
const ScansDAO = require('../../dao/scans');
const UserAttributesService = require('../../services/user-attributes');
const {
  get, post, put, authHeader
} = require('../../test-helpers/http');
const { group, sandbox } = require('../../test-helpers/fresh');

function beforeEach() {
  sandbox().stub(
    UserAttributesService,
    'recordScan',
    () => Promise.resolve()
  );
}

const test = group(beforeEach);

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

test('POST /scans allows specifying isComplete', (t) => {
  let userId;
  return createUser()
    .then(({ user, session }) => {
      userId = user.id;

      return post('/scans', {
        body: {
          type: 'PHOTO',
          isComplete: true
        },
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201);
      t.equal(body.userId, userId);
      t.equal(body.isComplete, true);
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
    .then(([response]) => {
      t.equal(response.status, 403);
    });
});

test('GET /scans returns a list of your own scans', (t) => {
  let userId;
  let sessionId;
  let scanId;

  return createUser()
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

test('GET /scans returns a list of all scans when admin', async (t) => {
  sandbox().stub(
    ScansDAO,
    'findAll',
    async () => [new Scan({ id: '1234' })]
  );

  const { session } = await createUser({ role: 'ADMIN' });

  const [response, body] = await get('/scans', {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, '1234');
});

test('GET /scans returns a list of fit partner scans when signed in as a fit partner', async (t) => {
  sandbox().stub(
    ScansDAO,
    'findByFitPartner',
    async () => [new Scan({ id: '5678' })]
  );

  const { session } = await createUser({ role: 'FIT_PARTNER' });

  const [response, body] = await get('/scans', {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, '5678');
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

test('GET /scans/:id/photos returns a list of photos to an admin', (t) => {
  let sessionId;
  let scanId;
  let photoId;

  return createUser({ role: 'ADMIN' })
    .then(({ user, session }) => {
      sessionId = session.id;

      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo,
        userId: user.id
      });
    })
    .then((scan) => {
      scanId = scan.id;
      return ScanPhotosDAO.create({
        scanId
      });
    })
    .then((photo) => {
      photoId = photo.id;

      return get(`/scans/${scanId}/photos`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.length, 1);
      t.equal(body[0].id, photoId);
    });
});

test('GET /scans/:id/photos returns a list of photos to the scan owner', (t) => {
  let sessionId;
  let scanId;
  let photoId;

  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo,
        userId: user.id
      });
    })
    .then((scan) => {
      scanId = scan.id;
      return ScanPhotosDAO.create({
        scanId
      });
    })
    .then((photo) => {
      photoId = photo.id;

      return get(`/scans/${scanId}/photos`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.length, 1);
      t.equal(body[0].id, photoId);
    });
});

test('GET /scans/:id/photos returns 404 if scan not found', (t) => {
  return createUser()
    .then(({ session }) => {
      return get('/scans/5f8deaa3-f35f-4759-ac00-a54c8ece1f67/photos', {
        headers: authHeader(session.id)
      });
    })
    .then(([response]) => {
      t.equal(response.status, 404);
    });
});

test('GET /scans/:id/photos returns 403 if unauthorized', (t) => {
  let otherSessionId;

  return Promise.all([
    createUser(),
    createUser()
  ])
    .then(([owner, otherUser]) => {
      otherSessionId = otherUser.session.id;

      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo,
        userId: owner.user.id
      });
    })
    .then((scan) => {
      return get(`/scans/${scan.id}/photos`, {
        headers: authHeader(otherSessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'Forbidden');
    });
});

test('GET /scans/:id returns a scan', (t) => {
  let sessionId;

  return createUser({ role: 'ADMIN' })
    .then(({ user, session }) => {
      sessionId = session.id;

      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo,
        userId: user.id
      });
    })
    .then((scan) => {
      return get(`/scans/${scan.id}`, {
        headers: authHeader(sessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.type, 'PHOTO');
    });
});

test('PUT /scans/:id allows a scan to be updated', (t) => {
  let sessionId;
  return createUser()
    .then(({ session }) => {
      sessionId = session.id;
      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo,
        isComplete: false,
        measurements: null
      });
    })
    .then((scan) => {
      return put(`/scans/${scan.id}`, {
        body: {
          isComplete: true,
          measurements: { length: 10 }
        },
        headers: authHeader(sessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.isComplete, true);
      t.equal(body.measurements.length, 10);
    });
});

test('PUT /scans/:id disallows invalid measurements', (t) => {
  let sessionId;
  return createUser()
    .then(({ session }) => {
      sessionId = session.id;
      return ScansDAO.create({
        type: ScansDAO.SCAN_TYPES.photo
      });
    })
    .then((scan) => {
      return put(`/scans/${scan.id}`, {
        body: {
          isComplete: true,
          measurements: { weightLbs: 9999 }
        },
        headers: authHeader(sessionId)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, 'Invalid weight value');
    });
});
