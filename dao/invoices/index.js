'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first');
const Invoice = require('../../domain-objects/invoice');
const { requireValues } = require('../../services/require-properties');

const instantiate = row => new Invoice(row);
const maybeInstantiate = data => (data && new Invoice(data)) || null;

const { dataMapper } = Invoice;

const TABLE_NAME = 'invoices';

async function findUnpaidByDesignAndStatus(designId, statusId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      paid_at: null,
      design_id: designId,
      design_status_id: statusId
    })
    .orderBy('created_at', 'desc')
    .then(invoices => invoices.map(instantiate))
    .catch(rethrow);
}

async function findByDesign(designId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      design_id: designId
    })
    .orderBy('created_at', 'desc')
    .then(invoices => invoices.map(instantiate))
    .catch(rethrow);
}

async function findByUser(userId) {
  const result = await db.raw(`
select i.*
  from invoices as i
    left join product_designs as d
      on d.id = i.design_id
    left join users as u
      on u.id = d.user_id
  where u.id = ?
  and d.deleted_at is null
  and i.deleted_at is null
  order by i.created_at desc;
    `, [userId])
    .catch(rethrow);

  const { rows } = result;
  return rows.map(instantiate);
}

// Create must happen in a transaction that also creates an InvoiceBreakdown.
// see services/create-invoice
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
    .then(maybeInstantiate)
    .catch(rethrow);
}

async function findById(id) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

async function deleteById(id) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({
      deleted_at: (new Date()).toISOString()
    }, '*')
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

module.exports = {
  deleteById,
  findUnpaidByDesignAndStatus,
  findByDesign,
  findByUser,
  findById,
  createTrx,
  update
};
