'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const Address = require('../../domain-objects/address');
const db = require('../../services/db');
const first = require('../../services/first');
const { requirePropertiesFormatted } = require('../../services/require-properties');

const instantiate = data => new Address(data);
const maybeInstantiate = data => (data && new Address(data)) || null;

const TABLE_NAME = 'addresses';

function validate(data) {
  const requiredMessages = {
    addressLine1: 'Address Line 1',
    city: 'City',
    region: 'Region',
    postCode: 'Post Code',
    country: 'Country'
  };

  requirePropertiesFormatted(data, requiredMessages);
}

function create(data) {
  validate(data);

  return db(TABLE_NAME).insert({
    id: uuid.v4(),
    company_name: data.companyName,
    address_line_1: data.addressLine1,
    address_line_2: data.addressLine2,
    city: data.city,
    region: data.region,
    post_code: data.postCode,
    country: data.country,
    user_id: data.userId
  }, '*')
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
    .update({
      deleted_at: new Date()
    }, '*')
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

module.exports = {
  create,
  deleteById,
  findById,
  validate,
  findByUserId
};
