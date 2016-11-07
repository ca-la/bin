'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const Promise = require('bluebird');

const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const User = require('../../domain-objects/user');
const { hash } = require('../../services/hash');

const instantiate = data => new User(data);

function create(data) {
  if (!data.name || !data.zip || !data.email || !data.password) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  if (!data.email.match(/.+@.+/)) {
    return Promise.reject(new InvalidDataError('Invalid email'));
  }

  return hash(data.password)
    .then(passwordHash =>
      db('users').insert({
        id: uuid.v4(),
        name: data.name,
        zip: data.zip,
        email: data.email,
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

module.exports = {
  create
};
