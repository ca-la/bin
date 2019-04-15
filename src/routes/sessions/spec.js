'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const SessionsDAO = require('../../dao/sessions');
const UsersDAO = require('../../components/users/dao');
const { get, post } = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'UsEr@example.com',
  password: 'hunter2',
  referralCode: 'freebie',
  role: 'ADMIN'
});

const UNAUTHORIZED_ERROR_MSG = "You can't log in to this type of account on this page. Contact hi@ca.la if you're unable to locate the correct login page.";

test('POST /sessions returns a 400 if user creation fails', (t) => {
  sandbox().stub(SessionsDAO, 'create').rejects(new InvalidDataError('Bad email'));

  return post('/sessions', { body: { email: 'user@example.com', password: 'hunter2' } })
    .then(([response, body]) => {
      t.equal(response.status, 400, 'status=400');
      t.equal(body.message, 'Bad email');
    });
});

test('POST /sessions returns 400 for bad password', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => {
      return post('/sessions', { body: { email: 'user@example.com', password: 'nope' } });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, 'Incorrect password for user@example.com');
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
      t.equal(body.role, 'ADMIN');
      t.equal(body.user.passwordHash, undefined);
    });
});

test('POST /sessions allows emails with different formatting', (t) => {
  let user;
  return UsersDAO.create(USER_DATA)
    .then((_user) => {
      user = _user;
      return post('/sessions', { body: { email: 'USER@EXAMPLE.com', password: 'hunter2' } });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.userId, user.id);
      t.equal(body.role, 'ADMIN');
      t.equal(body.user.passwordHash, undefined);
    });
});

test('POST /sessions can create elevated role permissions', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => {
      return post('/sessions', {
        body: {
          email: 'user@example.com',
          password: 'hunter2',
          role: 'ADMIN'
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.role, 'ADMIN');
    });
});

test('POST /sessions can create other available roles', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => {
      return post('/sessions', {
        body: {
          email: 'user@example.com',
          password: 'hunter2',
          role: 'PARTNER'
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.role, 'PARTNER');
    });
});

test('POST /sessions cannot create elevated role permissions if user is role USER', (t) => {
  const nonAdmin = { ...USER_DATA, role: 'USER' };

  return UsersDAO.create(nonAdmin)
    .then(() => {
      return post('/sessions', {
        body: {
          email: 'user@example.com',
          password: 'hunter2',
          role: 'ADMIN'
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, UNAUTHORIZED_ERROR_MSG);
    });
});

test('POST /sessions allows specifying expiry', (t) => {
  let user;
  return UsersDAO.create(USER_DATA)
    .then((_user) => {
      user = _user;
      return post('/sessions', {
        body: {
          email: 'user@example.com',
          password: 'hunter2',
          expireAfterSeconds: 30
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.userId, user.id);
      t.equal(body.user.passwordHash, undefined);

      const now = (new Date()).getTime();
      const expiry = (new Date(body.expiresAt)).getTime();
      const differenceSeconds = (expiry - now) / 1000;

      t.equal(differenceSeconds > 20, true);
      t.equal(differenceSeconds < 40, true);
    });
});

test('POST /sessions can create other available roles', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => {
      return post('/sessions', {
        body: {
          email: 'user@example.com',
          password: 'hunter2',
          role: 'PARTNER'
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 201, 'status=201');
      t.equal(body.role, 'PARTNER');
    });
});

test('POST /sessions cannot create elevated role permissions if user is role USER', (t) => {
  const nonAdmin = Object.assign({}, USER_DATA, { role: 'USER' });

  return UsersDAO.create(nonAdmin)
    .then(() => {
      return post('/sessions', {
        body: {
          email: 'user@example.com',
          password: 'hunter2',
          role: 'ADMIN'
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, UNAUTHORIZED_ERROR_MSG);
    });
});

test('POST /sessions cannot create USER sessions by omission, if a partner', (t) => {
  const nonAdmin = Object.assign({}, USER_DATA, { role: 'PARTNER' });

  return UsersDAO.create(nonAdmin)
    .then(() => {
      return post('/sessions', {
        body: {
          email: 'user@example.com',
          password: 'hunter2',
          role: 'USER'
        }
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, UNAUTHORIZED_ERROR_MSG);
    });
});

test('GET /sessions/:id returns a 404 if session does not exist', (t) => {
  return get('/sessions/a1bfdc04-7418-4634-be1a-5b9dd75429db').then(([response]) => {
    t.equal(response.status, 404);
  });
});

test('GET /sessions/:id returns a session with user attached', (t) => {
  let user;
  let session;

  return UsersDAO.create(USER_DATA)
    .then((_user) => {
      user = _user;
      return SessionsDAO.createForUser(user);
    })
    .then((_session) => {
      session = _session;
      return get(`/sessions/${session.id}`);
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.id, session.id);
      t.equal(body.user.id, user.id);
    });
});
