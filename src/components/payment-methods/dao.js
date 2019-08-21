'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const db = require('../../services/db');
const first = require('../../services/first').default;
const PaymentMethod = require('./domain-object');

const instantiate = row => new PaymentMethod(row);
const maybeInstantiate = data => (data && new PaymentMethod(data)) || null;

const { dataMapper } = PaymentMethod;

const TABLE_NAME = 'payment_methods';

async function findById(id, trx) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify(query => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then(first)
    .then(maybeInstantiate);
}

async function findByUserId(userId, trx) {
  return trx(TABLE_NAME)
    .where({
      deleted_at: null,
      user_id: userId
    })
    .then(paymentMethods => paymentMethods.map(instantiate))
    .catch(rethrow);
}

async function create(data, trx) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .modify(query => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

module.exports = {
  findById,
  findByUserId,
  create
};
