'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first').default;
const Invoice = require('../../domain-objects/invoice');
const { requireValues } = require('../../services/require-properties');

const instantiate = row => new Invoice(row);
const maybeInstantiate = data => (data && new Invoice(data)) || null;

const { dataMapper } = Invoice;

const TABLE_NAME = 'invoices';
const VIEW_NAME = 'invoice_with_payments';

async function findByCollection(collectionId) {
  return db(VIEW_NAME)
    .where({
      collection_id: collectionId,
      deleted_at: null
    })
    .orderBy('created_at', 'desc')
    .then(invoices => invoices.map(instantiate))
    .catch(rethrow);
}

async function findByUser(userId) {
  return db
    .select('invoice_with_payments.*')
    .from(VIEW_NAME)
    .where({
      user_id: userId,
      deleted_at: null
    })
    .orderBy('created_at', 'desc')
    .then(invoices => invoices.map(instantiate))
    .catch(rethrow);
}

async function findById(id) {
  return db(VIEW_NAME)
    .where({ id, deleted_at: null })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

async function findByIdTrx(trx, id) {
  return db(VIEW_NAME)
    .transacting(trx)
    .where({ id, deleted_at: null })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

// Create must happen in a transaction that also creates an InvoiceBreakdown
async function createTrx(trx, data) {
  requireValues({ data, trx });

  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db(TABLE_NAME)
    .transacting(trx)
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

async function update(id, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then(() => findById(id))
    .catch(rethrow);
}

async function deleteById(id) {
  await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({
      deleted_at: (new Date()).toISOString()
    }, '*')
    .then(first);

  return db(VIEW_NAME)
    .select('*')
    .where({ id })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

module.exports = {
  deleteById,
  findByCollection,
  findByUser,
  findById,
  findByIdTrx,
  createTrx,
  update
};
