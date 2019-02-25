'use strict';

const createUser = require('../../test-helpers/create-user');
const InvalidDataError = require('../../errors/invalid-data');
const MailChimp = require('../../services/mailchimp');
const UsersDAO = require('../../dao/users');
const {
  get, post, put, authHeader
} = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'user@example.com',
  phone: '415 580 9925',
  zip: '94117',
  password: 'hunter2'
});

function stubUserDependencies() {
  sandbox().stub(MailChimp, 'subscribeToUsers').returns(Promise.resolve());
}

test('POST /users returns a 400 if user creation fails', (t) => {
  stubUserDependencies();

  sandbox().stub(UsersDAO, 'create').rejects(new InvalidDataError('Bad email'));

  return post('/users', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 400, 'status=400');
      t.equal(body.message, 'Bad email');
    });
});

test('POST /users returns new user data', (t) => {
  stubUserDependencies();

  return post('/users', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.name, 'Q User');
      t.equal(body.email, 'user@example.com');
      t.equal(body.phone, '+14155809925');
      t.equal(body.password, undefined);
      t.equal(body.passwordHash, undefined);
    });
});

test('POST /users returns a session instead if requested', (t) => {
  stubUserDependencies();

  return post('/users?returnValue=session', { body: USER_DATA })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.userId.length, 36);
      t.equal(body.user.name, 'Q User');
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

test('GET /users list returns 401 if not authorized', (t) => {
  return get('/users')
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Unauthorized');
    });
});

test('GET /users list returns 403 if logged in but not admin', (t) => {
  return createUser()
    .then(({ session }) => {
      return get('/users', {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'Forbidden');
    });
});


test('GET /users list returns a list of users if authorized', (t) => {
  let userId;

  return createUser({ role: 'ADMIN' })
    .then(({ user, session }) => {
      userId = user.id;
      return get('/users', {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.length, 1);
      t.equal(body[0].id, userId);
    });
});

test('GET /users/:id returns a user', (t) => {
  return createUser({ role: 'ADMIN' })
    .then(({ user, session }) => {
      return get(`/users/${user.id}`, {
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.name, 'Q User');
    });
});

test('GET /users/email-availability/:email returns false when unavailable', (t) => {
  return createUser()
    .then(({ user }) => {
      return get(`/users/email-availability/${user.email}`);
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, { available: false, isTaken: true, isValid: true });
    });
});

test('GET /users/email-availability/:email returns true when available', (t) => {
  return get('/users/email-availability/fuz@buz.qux')
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, { available: true, isTaken: false, isValid: true });
    });
});

test('GET /users/email-availability/:email returns false when invalid', (t) => {
  return get('/users/email-availability/fizzbuzz')
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, { available: false, isTaken: false, isValid: false });
    });
});

test('PUT /users/:id returns a 401 if unauthenticated', (t) => {
  return put('/users/123', { body: {} })
    .then(([response, body]) => {
      t.equal(response.status, 401);
      t.equal(body.message, 'Authorization is required to access this resource');
    });
});

test('PUT /users/:id returns a 403 if not the current user', (t) => {
  return createUser()
    .then(({ session }) => {
      return put('/users/123', {
        body: {},
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 403);
      t.equal(body.message, 'You can only update your own user');
    });
});

test('PUT /users/:id updates the current user', (t) => {
  return createUser()
    .then(({ user, session }) => {
      return put(`/users/${user.id}`, {
        body: {
          birthday: '2017-01-01'
        },
        headers: authHeader(session.id)
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.birthday, '2017-01-01');
    });
});
