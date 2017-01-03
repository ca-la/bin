'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const Address = require('../../domain-objects/address');
const db = require('../../services/db');
const first = require('../../services/first');

const instantiate = data => new Address(data);

function create(data) {
  return db('addresses').insert({
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
  return db('addresses').where({ user_id: userId })
    .catch(rethrow)
    .then(addresses => addresses.map(instantiate));
}

module.exports = {
  create,
  findByUserId
};
