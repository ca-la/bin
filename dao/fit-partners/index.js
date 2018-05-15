'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first');
const FitPartner = require('../../domain-objects/fit-partner');

const instantiate = data => new FitPartner(data);
const maybeInstantiate = data => (data ? instantiate(data) : null);

const { dataMapper } = FitPartner;
const TABLE_NAME = 'fit_partners';

function findById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

function findByAdminUserId(adminUserId) {
  return db(TABLE_NAME)
    .where({ admin_user_id: adminUserId })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

function create(data) {
  const rowData = Object.assign(
    {},
    compact(dataMapper.userDataToRowData(data)),
    { id: uuid.v4() }
  );

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

module.exports = {
  create,
  findById,
  findByAdminUserId
};
