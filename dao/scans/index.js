'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first');
const compact = require('../../services/compact');
const InvalidDataError = require('../../errors/invalid-data');
const Scan = require('../../domain-objects/scan');

const instantiate = data => new Scan(data);
const maybeInstantiate = data => (data && new Scan(data)) || null;

const { dataMapper } = Scan;
const TABLE_NAME = 'scans';

const SCAN_TYPES = {
  // Photo(s) uploaded by a customer
  photo: 'PHOTO',

  // A Human Solutions 3D body scan
  humanSolutions: 'HUMANSOLUTIONS'
};

function create(data) {
  const rowData = Object.assign(
    {},
    compact(dataMapper.userDataToRowData(data)),
    { id: uuid.v4() }
  );

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.NotNullViolation, (err) => {
      if (err.column === 'type') {
        throw new InvalidDataError('Scan type must be provided');
      }

      throw err;
    }))
    .then(first)
    .then(instantiate);
}

/**
  * @returns {Promise}
  * @resolves {Object|null}
  */
function findById(id) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

/**
  * @returns {Promise}
  * @resolves {Array}
  */
function findByUserId(userId) {
  return db(TABLE_NAME)
    .where({ user_id: userId, deleted_at: null })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(scans => scans.map(instantiate));
}

function findAll({ limit, offset }) {
  if (typeof limit !== 'number' || typeof offset !== 'number') {
    throw new Error('Limit and offset must be provided to find all scans');
  }

  return db(TABLE_NAME).select('*')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .then(users => users.map(instantiate));
}

function updateOneById(id, data) {
  return db(TABLE_NAME)
    .where({
      id,
      deleted_at: null
    })
    .update(compact({
      is_complete: data.isComplete,
      measurements: data.measurements,
      user_id: data.userId
    }), '*')
    .then(first)
    .then(instantiate);
}

function deleteById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .update({
      deleted_at: new Date()
    }, '*')
    .then(first)
    .then((scan) => {
      if (!scan) {
        throw new Error(`Could not find scan ${id} to delete`);
      }
      return scan;
    });
}

module.exports = {
  SCAN_TYPES,
  create,
  deleteById,
  findAll,
  findById,
  findByUserId,
  updateOneById
};
