'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const Scan = require('../../domain-objects/scan');

const instantiate = data => new Scan(data);
const maybeInstantiate = data => (data && new Scan(data)) || null;

const SCAN_TYPES = {
  // Photo(s) uploaded by a customer
  photo: 'PHOTO',

  // A Human Solutions 3D body scan
  humanSolutions: 'HUMANSOLUTIONS'
};

function create(data) {
  return db('scans').insert({
    id: uuid.v4(),
    is_complete: data.isComplete,
    user_id: data.userId,
    type: data.type,
    measurements: data.measurements
  }, '*')
    .catch(rethrow)
    .catch(rethrow.ERRORS.NotNullViolation, (err) => {
      if (err.column === 'type') {
        throw new InvalidDataError('Scan type must be provided');
      }

      throw err;
    })
    .then(first)
    .then(instantiate);
}

/**
  * @returns {Promise}
  * @resolves {Object|null}
  */
function findById(id) {
  return db('scans').where({ id })
    .catch(rethrow)
    .then(first)
    .then(maybeInstantiate);
}

/**
  * @returns {Promise}
  * @resolves {Array}
  */
function findByUserId(userId) {
  return db('scans').where({ user_id: userId })
    .catch(rethrow)
    .then(scans => scans.map(instantiate));
}

function updateOneById(id, data) {
  return db('scans')
    .where({ id })
    .update({
      is_complete: data.isComplete
    }, '*')
    .then(first)
    .then(instantiate);
}

module.exports = {
  SCAN_TYPES,
  create,
  findById,
  findByUserId,
  updateOneById
};
