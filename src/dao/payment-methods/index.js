'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const db = require('../../services/db');
const first = require('../../services/first').default;
const PaymentMethod = require('../../domain-objects/payment-method');

const instantiate = row => new PaymentMethod(row);
const maybeInstantiate = data => (data && new PaymentMethod(data)) || null;

const { dataMapper } = PaymentMethod;

const TABLE_NAME = 'payment_methods';

async function findById(id) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .then(first)
    .then(maybeInstantiate);
}

async function findByUserId(userId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      user_id: userId
    })
    .then(paymentMethods => paymentMethods.map(instantiate))
    .catch(rethrow);
}

async function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

module.exports = {
  findById,
  findByUserId,
  create
};
