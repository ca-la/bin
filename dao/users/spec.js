'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const UsersDAO = require('./index');
const { test } = require('../../test-helpers/fresh');

const USER_DATA = {
  name: 'Q User',
  zip: '94117',
  email: 'user@example.com',
  password: 'hunter2'
};

test('UsersDAO.create fails when required data is missing', (t) => {
  t.plan(1);

  return UsersDAO.create({ name: 'Q User', password: 'hunter2' })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
    });
});

test('UsersDAO.create returns a new user', (t) => {
  return UsersDAO.create(USER_DATA)
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.zip, '94117');
      t.equal(user.id.length, 36);
      t.notEqual(user.passwordHash, 'hunter2');
    });
});

test('UsersDAO.findByEmail returns null if a user does not exist', (t) => {
  return UsersDAO.findByEmail('fooz@example.com').then((user) => {
    t.equal(user, null);
  });
});

test('UsersDAO.findByEmail returns a user', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findByEmail('user@example.com'))
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.zip, '94117');
    });
});

