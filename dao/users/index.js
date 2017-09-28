'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const Promise = require('bluebird');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const UnassignedReferralCodesDAO = require('../unassigned-referral-codes');
const User = require('../../domain-objects/user');
const { hash } = require('../../services/hash');
const { validateAndFormatPhoneNumber } = require('../../services/validation');

const instantiate = data => new User(data);
const maybeInstantiate = data => (data && new User(data)) || null;

const ERROR_CODES = {
  emailTaken: Symbol('Email taken'),
  phoneTaken: Symbol('Phone taken')
};

function isValidEmail(email) {
  return Boolean(email && email.match(/.+@.+/));
}

function create(data, options = {}) {
  const {
    name,
    email,
    phone,
    password,
    role,
    isSmsPreregistration
  } = data;

  // Allow passing `options.requirePassword = false` to disable the password
  // requirement. This is a very rare case, so intentionally a bit clumsy.
  const requirePassword = options.requirePassword !== false;

  if (!name || (requirePassword && !password)) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  if (!email && !phone) {
    return Promise.reject(new InvalidDataError('Either phone or email must be provided'));
  }

  if (email && !isValidEmail(email)) {
    return Promise.reject(new InvalidDataError('Invalid email'));
  }

  let validatedPhone;

  if (phone) {
    try {
      validatedPhone = validateAndFormatPhoneNumber(data.phone);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  return Promise.all([
    data.referralCode || UnassignedReferralCodesDAO.get(),
    password && hash(password)
  ])
    .then(([referralCode, passwordHash]) =>
      db('users').insert({
        id: uuid.v4(),
        email,
        is_sms_preregistration: isSmsPreregistration,
        name,
        password_hash: passwordHash,
        phone: validatedPhone,
        referral_code: referralCode,
        role
      }, '*')
    )
    .catch(rethrow)
    .catch(rethrow.ERRORS.UniqueViolation, (err) => {
      switch (err.constraint) {
        case 'users_unique_email':
          throw new InvalidDataError(
            'Email is already taken',
            ERROR_CODES.emailTaken
          );
        case 'users_unique_phone':
          throw new InvalidDataError(
            'Phone number is already taken',
            ERROR_CODES.phoneTaken
          );
        default:
          throw err;
      }
    })
    .then(first)
    .then(instantiate);
}

function createSmsPreregistration(data) {
  const userData = Object.assign({}, data, {
    isSmsPreregistration: true
  });

  return create(userData, {
    requirePassword: false
  });
}

function findById(id) {
  return db('users').where({ id })
    .then(first)
    .then(maybeInstantiate);
}

function findAll({ limit, offset, search }) {
  if (typeof limit !== 'number' || typeof offset !== 'number') {
    throw new Error('Limit and offset must be provided to find all users');
  }

  return db('users').select('*')
    .orderBy('created_at', 'desc')
    .modify((query) => {
      if (search) {
        query.where(db.raw('name ~* :search or email ~* :search', { search }));
      }
    })
    .limit(limit)
    .offset(offset)
    .then(users => users.map(instantiate));
}

function findByEmail(email) {
  return db('users').whereRaw('lower(users.email) = lower(?)', [email])
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

function update(userId, data) {
  if (data.email !== undefined && !isValidEmail(data.email)) {
    return Promise.reject(new InvalidDataError('Invalid email'));
  }

  return db('users')
    .where({ id: userId })
    .update(compact({
      name: data.name,
      email: data.email,
      birthday: data.birthday
    }), '*')
    .then(first)
    .then(instantiate);
}

function completeSmsPreregistration(userId, data) {
  const { name, email, phone, password } = data;

  if (!name || !email || !phone || !password) {
    return Promise.reject(new InvalidDataError('Missing required information'));
  }

  if (!isValidEmail(email)) {
    return Promise.reject(new InvalidDataError('Invalid email'));
  }

  let validatedPhone;

  try {
    validatedPhone = validateAndFormatPhoneNumber(phone);
  } catch (err) {
    return Promise.reject(err);
  }

  return hash(password)
    .then((passwordHash) => {
      return db('users')
        .where({ id: userId })
        .update(compact({
          is_sms_preregistration: false,
          password_hash: passwordHash,
          name,
          email,
          phone: validatedPhone
        }), '*');
    })
    .then(first)
    .then(instantiate)
    .catch(rethrow)
    .catch(rethrow.ERRORS.UniqueViolation, (err) => {
      switch (err.constraint) {
        case 'users_unique_email':
          throw new InvalidDataError(
            'Email is already taken',
            ERROR_CODES.emailTaken
          );
        case 'users_unique_phone':
          throw new InvalidDataError(
            'Phone number is already taken',
            ERROR_CODES.phoneTaken
          );
        default:
          throw err;
      }
    });
}

module.exports = {
  ERROR_CODES,
  create,
  createSmsPreregistration,
  completeSmsPreregistration,
  isValidEmail,
  findAll,
  findByEmail,
  findById,
  findByReferralCode,
  update,
  updatePassword
};
