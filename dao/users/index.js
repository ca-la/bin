'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const Promise = require('bluebird');

const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const UnassignedReferralCodesDAO = require('../unassigned-referral-codes');
const User = require('../../domain-objects/user');
const { hash } = require('../../services/hash');

const instantiate = data => new User(data);
const maybeInstantiate = data => (data && new User(data)) || null;

function create(data) {
  const { name, zip, email, password, role } = data;

  if (!name || !zip || !email || !password) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  if (!email.match(/.+@.+/)) {
    return Promise.reject(new InvalidDataError('Invalid email'));
  }

  return Promise.all([
    data.referralCode || UnassignedReferralCodesDAO.get(),
    hash(password)
  ])
    .then(([referralCode, passwordHash]) =>
      db('users').insert({
        id: uuid.v4(),
        name,
        zip,
        email,
        role,
        password_hash: passwordHash,
        referral_code: referralCode
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

/**
 * This should only be used internally - we can create users without passwords
 * when they use a legacy authentication scheme (shopify).
 */
function createWithoutPassword(data) {
  const { name, zip, email } = data;

  if (!name || !zip || !email) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  if (!email.match(/.+@.+/)) {
    return Promise.reject(new InvalidDataError('Invalid email'));
  }

  const gettingReferralCode = data.referralCode ?
    Promise.resolve(data.referralCode) :
    UnassignedReferralCodesDAO.get();

  return gettingReferralCode
    .then((referralCode) => {
      return db('users').insert({
        id: uuid.v4(),
        name,
        zip,
        email,
        referral_code: referralCode
      }, '*');
    })
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

function findById(id) {
  return db('users').where({ id })
    .then(first)
    .then(maybeInstantiate);
}

function findAll({ limit, offset }) {
  if (typeof limit !== 'number' || typeof offset !== 'number') {
    throw new Error('Limit and offset must be provided to find all users');
  }

  return db('users').select('*')
    .then(users => users.map(instantiate));
}

function findByEmail(email) {
  return db('users').where({ email })
    .then(first)
    .then(maybeInstantiate);
}

function findByReferralCode(referralCode) {
  return db('users')
    .whereRaw('lower(referral_code) = ?', referralCode.toLowerCase())
    .then(first)
    .then(maybeInstantiate);
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
  createWithoutPassword,
  findAll,
  findByEmail,
  findById,
  findByReferralCode,
  updatePassword
};
