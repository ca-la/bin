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
const { ROLES } = require('../../domain-objects/user');

const instantiate = data => new Session(data);
const maybeInstantiate = data => (data && new Session(data)) || null;

/**
 * Sign in a user to Shopify, and update their local password if we succeed
 * @resolves {Boolean} Whether their password was correct
 */
function updatePasswordFromShopify(user, password) {
  return Shopify.login(user.email, password)
    .then(() => UsersDAO.updatePassword(user.id, password))
    .then(() => true)
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.log('Shopify login error:', err.stack);
      return false;
    });
}

/**
 * @param {Object} user A User instance
 */
function createForUser(user, additionalData = {}) {
  return db('sessions').insert({
    id: uuid.v4(),
    user_id: user.id,
    expires_at: additionalData.expiresAt,
    role: additionalData.role
  }, '*')
    .then(first)
    .then(instantiate)
    .then((session) => {
      session.setUser(user);
      return session;
    });
}

function create(data) {
  const { email, password, role } = data;

  if (!email || !password) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  let user;

  return UsersDAO.findByEmail(email)
    .then((_user) => {
      user = _user;

      if (!user) {
        throw new InvalidDataError('No matching user found');
      }

      if (!user.passwordHash) {
        return updatePasswordFromShopify(user, password);
      }

      return compare(password, user.passwordHash);
    })
    .then((match) => {
      if (!match) {
        throw new InvalidDataError('Incorrect password');
      }

      if (
        role === ROLES.admin &&
        user.role !== ROLES.admin
      ) {
        throw new InvalidDataError('User may not assume this role');
      }

      return createForUser(user, {
        expiresAt: data.expiresAt,
        role
      });
    });
}

/**
 * @param {String} id The session ID
 * @param {Boolean} shouldAttachUser Whether to find the corresponding User
 * resource and attach it to the Session domain object.
 */
function findById(id, shouldAttachUser = false) {
  return db('sessions')
    .whereRaw(
      'id = ? and (expires_at is null or expires_at > now())',
      [id]
    )
    .then(first)
    .then(maybeInstantiate)
    .then((session) => {
      if (session && shouldAttachUser) {
        return UsersDAO.findById(session.userId).then((user) => {
          session.setUser(user);
          return session;
        });
      }

      return session;
    })
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

function deleteById(id) {
  return db('sessions')
    .where({ id })
    .del();
}

module.exports = {
  create,
  createForUser,
  deleteByUserId,
  deleteById,
  findById
};
