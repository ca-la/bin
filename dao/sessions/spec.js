'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const SessionsDAO = require('./index');
const Shopify = require('../../services/shopify');
const UsersDAO = require('../users');
const { test, sandbox } = require('../../test-helpers/fresh');

const USER_DATA = {
  name: 'Q User',
  zip: '94117',
  email: 'user@example.com',
  password: 'hunter2'
};

test('SessionsDAO.create fails when required data is missing', (t) => {
  return SessionsDAO.create({ password: 'hunter2' })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Missing required information');
    });
});

test('SessionsDAO.create fails when email does not match a user', (t) => {
  sandbox().stub(Shopify, 'login', () => Promise.reject(new Error('nope')));

  return SessionsDAO.create({ email: 'user@example.com', password: 'hunter2' })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'No matching user found');
    });
});

test('SessionsDAO.create succeeds when email and password match a shopify user', (t) => {
  sandbox().stub(Shopify, 'login', () => Promise.resolve());

  return SessionsDAO.create({ email: 'user@example.com', password: 'hunter2' })
    .then((session) => {
      t.equal(session.id.length, 36);
      t.equal(session.user.name, 'user@example.com');
    });
});

test('SessionsDAO.create fails when password is incorrect', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => SessionsDAO.create({ email: 'user@example.com', password: 'hunter3' }))
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Incorrect password');
    });
});

test('Sessions.create returns a new session with user attached', (t) => {
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
