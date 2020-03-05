'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const omit = require('lodash/omit');

const Address = require('../../domain-objects/address');
const db = require('../../services/db');
const first = require('../../services/first').default;
const compact = require('../../services/compact');

const { validatePropertiesFormatted } = require('../../services/validate');

const instantiate = data => new Address(data);
const maybeInstantiate = data => (data && new Address(data)) || null;

const { dataMapper } = Address;
const TABLE_NAME = 'addresses';

function validate(data) {
  const requiredMessages = {
    addressLine1: 'Address Line 1',
    city: 'City',
    region: 'Region',
    postCode: 'Post Code',
    country: 'Country'
  };

  validatePropertiesFormatted(data, requiredMessages);
}

function create(data) {
  validate(data);

  const rowData = Object.assign(
    {},
    compact(dataMapper.userDataToRowData(data)),
    { id: uuid.v4() }
  );

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByUserId(userId) {
  return db(TABLE_NAME)
    .where({
      user_id: userId,
      deleted_at: null
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(addresses => addresses.map(instantiate));
}

function findById(id) {
  return db(TABLE_NAME)
    .where({
      id,
      deleted_at: null
    })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

function deleteById(id) {
  return db(TABLE_NAME)
    .where({
      id,
      deleted_at: null
    })
    .update(
      {
        deleted_at: new Date()
      },
      '*'
    )
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

function update(id, data) {
  return db(TABLE_NAME)
    .where({
      id
    })
    .update(
      compact(
        dataMapper.userDataToRowData(omit(data, 'userId', 'id', 'createdAt'))
      ),
      '*'
    )
    .then(first)
    .then(instantiate);
}

module.exports = {
  create,
  update,
  deleteById,
  findById,
  validate,
  findByUserId
};
