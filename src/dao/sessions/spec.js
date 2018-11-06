'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const SessionsDAO = require('./index');
const UsersDAO = require('../users');
const { test } = require('../../test-helpers/fresh');

const USER_DATA = {
  name: 'Q User',
  zip: '94117',
  email: 'user@example.com',
  password: 'hunter2',
  referralCode: 'freebie'
};

test('SessionsDAO.create fails when required data is missing', (t) => {
  return SessionsDAO.create({ password: 'hunter2' })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Missing required information');
    });
});

test('SessionsDAO.create fails when email does not match a user', (t) => {
  return SessionsDAO.create({ email: 'user@example.com', password: 'hunter2' })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'No user found with this email address');
    });
});

test('SessionsDAO.create fails when we match a password-less user', (t) => {
  return UsersDAO.create(USER_DATA, { requirePassword: false })
    .then(() => SessionsDAO.create({ email: 'user@example.com', password: 'hunter2' }))
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'It looks like you donʼt have a password yet. To create one, use the Forgot Password link.');
    });
});

test('SessionsDAO.create fails when password is incorrect', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => SessionsDAO.create({ email: 'user@example.com', password: 'hunter3' }))
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Incorrect password for user@example.com');
    });
});

test('Sessions.create succeeds and returns a new session with user attached', (t) => {
  let user;
  return UsersDAO.create(USER_DATA)
    .then((_user) => {
      user = _user;
      return SessionsDAO.create({
        email: 'user@example.com',
        password: 'hunter2'
      });
    })
    .then((session) => {
      t.equal(session.userId, user.id);
      t.equal(session.id.length, 36);
      t.equal(session.user.name, 'Q User');
    });
});

test('SessionsDAO.findById returns null if a session does not exist', (t) => {
  return SessionsDAO.findById('1234').then((session) => {
    t.equal(session, null);
  });
});

test('SessionsDAO.findById returns a session', (t) => {
  let user;
  return UsersDAO.create(USER_DATA)
    .then((_user) => {
      user = _user;
      return SessionsDAO.create({
        email: 'user@example.com',
        password: 'hunter2'
      });
    })
    .then(session => SessionsDAO.findById(session.id))
    .then((session) => {
      t.equal(session.userId, user.id);
    });
});

test('SessionsDAO.findById returns a session that has not expired', (t) => {
  let user;
  return UsersDAO.create(USER_DATA)
    .then((_user) => {
      user = _user;
      return SessionsDAO.create({
        email: 'user@example.com',
        expiresAt: new Date('2099-01-01'),
        password: 'hunter2'
      });
    })
    .then(session => SessionsDAO.findById(session.id))
    .then((session) => {
      t.equal(session.userId, user.id);
    });
});

test('SessionsDAO.findById returns null if a session has expired', (t) => {
  return UsersDAO.create({ ...USER_DATA, role: 'ADMIN' })
    .then(() => {
      return SessionsDAO.create({
        email: 'user@example.com',
        expiresAt: new Date('2005-01-01'),
        password: 'hunter2'
      });
    })
    .then(session => SessionsDAO.findById(session.id))
    .then((session) => {
      t.equal(session, null);
    });
});

test('SessionsDAO.createForUser uses default user role', async (t) => {
  const data = Object.assign({}, USER_DATA, { role: 'PARTNER' });
  const user = await UsersDAO.create(data);
  t.equal(user.role, 'PARTNER');

  const session = await SessionsDAO.createForUser(user);
  t.equal(session.role, 'PARTNER');
});
