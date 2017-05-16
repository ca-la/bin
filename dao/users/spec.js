'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const UsersDAO = require('./index');
const { test } = require('../../test-helpers/fresh');

const USER_DATA = {
  name: 'Q User',
  email: 'user@example.com',
  password: 'hunter2',
  referralCode: 'freebie'
};

const USER_DATA_WITH_PHONE = Object.assign({}, USER_DATA, {
  email: null,
  phone: '415 580 9925'
});

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
    password: 'hunter2'
  })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Invalid email');
    });
});

test('UsersDAO.create fails if phone is invalid', (t) => {
  return UsersDAO.create({
    name: 'Q User',
    email: 'user@example.com',
    phone: '911',
    password: 'hunter2'
  })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Invalid country calling code');
    });
});

test('UsersDAO.create returns a new user with email but no phone', (t) => {
  return UsersDAO.create(USER_DATA)
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.email, 'user@example.com');
      t.equal(user.id.length, 36);
      t.notEqual(user.passwordHash, 'hunter2');
      t.equal(user.phone, null);
    });
});

test('UsersDAO.create returns a new user with phone but no email', (t) => {
  return UsersDAO.create(USER_DATA_WITH_PHONE)
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.id.length, 36);
      t.notEqual(user.passwordHash, 'hunter2');
      t.equal(user.phone, '+14155809925');
      t.equal(user.email, null);
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
    });
});

test('UsersDAO.findAll returns users', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0 }))
    .then((users) => {
      t.equal(users.length, 1);
    });
});

test('UsersDAO.findAll respects offset', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 1 }))
    .then((users) => {
      t.equal(users.length, 0);
    });
});

test('UsersDAO.findAll finds based on matching search terms', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0, search: 'q user' }))
    .then((users) => {
      t.equal(users.length, 1);
    });
});

test('UsersDAO.findAll returns nothing if no search matches', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0, search: 'flexbox' }))
    .then((users) => {
      t.equal(users.length, 0);
    });
});

test('UsersDAO.update updates a user', (t) => {
  return UsersDAO.create(USER_DATA)
    .then((user) => {
      return UsersDAO.update(user.id, {
        birthday: '2017-01-01'
      });
    })
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.birthday, '2017-01-01');
    });
});
