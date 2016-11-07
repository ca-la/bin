'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const User = require('../../domain-objects/user');

const instantiate = data => new User(data);

function create(data) {
  return db('users')
    .insert({
      id: uuid.v4(),
      name: data.name,
      zip: data.zip,
      email: data.email
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

module.exports = {
  create
};
