'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const compact = require('../../services/compact');
const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const Collection = require('../../domain-objects/collection');

const instantiate = data => new Collection(data);
const maybeInstantiate = data => (data && new Collection(data)) || null;

const { dataMapper } = Collection;

const TABLE_NAME = 'collections';

function create(data) {
  const rowData = Object.assign(dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function deleteById(collectionId) {
  return db(TABLE_NAME)
    .where({ id: collectionId, deleted_at: null })
    .update({
      deleted_at: new Date()
    }, '*')
    .then(first)
    .then(instantiate);
}

function update(collectionId, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  if (Object.keys(rowData).length < 1) {
    throw new InvalidDataError('No data provided');
  }

  return db(TABLE_NAME)
    .where({ id: collectionId, deleted_at: null })
    .update(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

function findByUserId(userId, filters) {
  const query = Object.assign({
    created_by: userId,
    deleted_at: null
  }, filters);

  return db(TABLE_NAME)
    .where(query)
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(designs => designs.map(instantiate));
}

function findAll({ limit, offset, search }) {
  if (typeof limit !== 'number' || typeof offset !== 'number') {
    return Promise.reject(new Error('Limit and offset must be provided to find all collections'));
  }

  return db(TABLE_NAME)
    .where({ deleted_at: null })
    .orderBy('created_at', 'desc')
    .modify((query) => {
      if (search) {
        query.andWhere(db.raw('title ~* ?', [search]));
      }
    })
    .limit(limit)
    .offset(offset)
    .then(designs => designs.map(instantiate));
}

function findById(id, filters, options = {}) {
  const query = Object.assign({ id }, filters);

  if (options.includeDeleted !== true) {
    query.deleted_at = null;
  }

  return db(TABLE_NAME)
    .where(query)
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

module.exports = {
  create,
  deleteById,
  update,
  findAll,
  findById,
  findByUserId
};
