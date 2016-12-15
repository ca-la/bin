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
  return UsersDAO.create({ name: 'Q User', password: 'hunter2' })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
    });
});

test('UsersDAO.create fails if user already exists', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.create(USER_DATA))
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Email is already taken');
    });
});

test('UsersDAO.create fails if email is invalid', (t) => {
  return UsersDAO.create({
    name: 'Q User',
    email: 'user at example.com',
    zip: '94117',
    password: 'hunter2'
  })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Invalid email');
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

