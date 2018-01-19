'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first');
const Invoice = require('../../domain-objects/invoice');

const instantiate = row => new Invoice(row);
const maybeInstantiate = data => (data && new Invoice(data)) || null;

const { dataMapper } = Invoice;

const TABLE_NAME = 'invoices';

async function findByDesignAndStatus(designId, statusId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      design_id: designId,
      status_id: statusId
    })
    .catch(rethrow)
    .then(invoices => invoices.map(instantiate));
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

async function update(id, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then(first)
    .then(maybeInstantiate);
}

module.exports = {
  findByDesignAndStatus,
  create,
  update
};
