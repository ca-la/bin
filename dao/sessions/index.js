'use strict';

const Promise = require('bluebird');
const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const Session = require('../../domain-objects/session');
const Shopify = require('../../services/shopify');
const UsersDAO = require('../users');
const { compare } = require('../../services/hash');

const instantiate = data => (data && new Session(data)) || null;

function createUserFromShopify(email, password) {
  return Shopify.login(email, password)
    .then(() => {
      return UsersDAO.create({
        email,
        name: email,
        password,
        zip: '00000'
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.log('Shopify login error:', err.stack);
      return null;
    });
}

/**
 * @param {Object} user A User instance
 */
function createForUser(user) {
  return db('sessions').insert({
    id: uuid.v4(),
    user_id: user.id
  }, '*')
    .then(first)
    .then(instantiate)
    .then((session) => {
      session.setUser(user);
      return session;
    });
}

function create(data) {
  const { email, password } = data;

  if (!email || !password) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  let user;

  return UsersDAO.findByEmail(email)
    .then((_user) => {
      if (!_user) {
        // If a CALA user doesn't exist, we attempt to fall back to legacy
        // Shopify user authentication. If these credentials worked for a
        // Shopify account, we create a new CALA account with the same details
        // and sign them in.
        return createUserFromShopify(email, password);
      }

      return _user;
    })
    .then((_user) => {
      user = _user;

      if (!user) {
        throw new InvalidDataError('No matching user found');
      }
      return compare(password, user.passwordHash);
    })
    .then((match) => {
      if (!match) {
        throw new InvalidDataError('Incorrect password');
      }

      return createForUser(user);
    });
}

function findById(id) {
  return db('sessions').where({ id })
    .then(first)
    .then(instantiate)
    .catch(rethrow)
    .catch(rethrow.ERRORS.InvalidTextRepresentation, () => {
      // If an invalid UUID is passed in, Postgres will complain. Treat this as
      // any other not-found case.
      return null;
    });
}

function deleteByUserId(userId) {
  return db('sessions')
    .where({ user_id: userId })
    .del();
}

module.exports = {
  create,
  createForUser,
  deleteByUserId,
  findById
};
