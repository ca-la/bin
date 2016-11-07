'use strict';

const { NotNullViolation } = require('pg-rethrow').ERRORS;

const UsersDAO = require('./index');
const { test } = require('../../test-helpers/fresh');

test('UsersDAO.create returns a new user', (t) => {
  return UsersDAO.create({
    name: 'Q User',
    zip: '94117',
    email: 'user@example.com',
    password: 'hunter2'
  })
    .then((user) => {
      t.equal(user.title, 'Q User');
      t.equal(user.zip, '94117');
      t.equal(user.id.length, 36);
      t.notEqual(user.passwordHash, 'hunter2');
    });
});

test('UsersDAO.create fails when required data is missing', (t) => {
  return UsersDAO.create({ name: 'Q User' })
    .catch((err) => {
      t.ok(err instanceof NotNullViolation);
    });
});
