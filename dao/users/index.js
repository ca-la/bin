'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const Promise = require('bluebird');

const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const User = require('../../domain-objects/user');
const { hash } = require('../../services/hash');

const instantiate = data => (data && new User(data)) || null;

function create(data) {
  const { name, zip, email, password } = data;

  if (!name || !zip || !email || !password) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  if (!email.match(/.+@.+/)) {
    return Promise.reject(new InvalidDataError('Invalid email'));
  }

  return hash(password)
    .then(passwordHash =>
      db('users').insert({
        id: uuid.v4(),
        name,
        zip,
        email,
        password_hash: passwordHash
      }, '*')
    )
    .catch(rethrow)
    .catch(rethrow.ERRORS.UniqueViolation, (err) => {
      if (err.constraint === 'users_unique_email') {
        throw new InvalidDataError('Email is already taken');
      }
      throw err;
    })
    .then(first)
    .then(instantiate);
}

function findByEmail(email) {
  return db('users').where({ email })
    .then(first)
    .then(instantiate);
}

function updatePassword(userId, password) {
  return hash(password)
    .then(passwordHash =>
      db('users')
        .where({ id: userId })
        .update({ password_hash: passwordHash }, '*')
    )
    .then(first)
    .then(instantiate);
}

module.exports = {
  create,
  findByEmail,
  updatePassword
};
