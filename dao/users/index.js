'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const User = require('../../domain-objects/user');
const { hash } = require('../../services/hash');

const instantiate = data => new User(data);

function create(data) {
  return hash(data.password)
    .then(passwordHash =>
      db('users').insert({
        id: uuid.v4(),
        name: data.name,
        zip: data.zip,
        email: data.email,
        password_hash: passwordHash
      }, '*').catch(rethrow)
    )
    .then(first)
    .then(instantiate);
}

module.exports = {
  create
};
