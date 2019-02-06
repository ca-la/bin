'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first').default;
const InvoiceBreakdown = require('../../domain-objects/invoice-breakdown');
const { requireValues } = require('../../services/require-properties');

const instantiate = row => new InvoiceBreakdown(row);
const maybeInstantiate = data => (data && new InvoiceBreakdown(data)) || null;

const { dataMapper } = InvoiceBreakdown;

const TABLE_NAME = 'invoice_breakdowns';

// Create must happen in a transaction that also creates an Invoice
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
    .then(first)
    .then(maybeInstantiate);
}

module.exports = {
  createTrx,
  update
};
