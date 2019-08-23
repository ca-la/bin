'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first').default;
const compact = require('../../services/compact');
const InvalidDataError = require('../../errors/invalid-data');
const Scan = require('../../domain-objects/scan');
const dataAdapter = require('../../domain-objects/scan-with-meta').dataApater;

const instantiate = data => new Scan(data);
const instantiateWithMeta = data => dataAdapter.parse(data);
const maybeInstantiate = data => (data && new Scan(data)) || null;

const { dataMapper } = Scan;
const TABLE_NAME = 'scans';

const SCAN_TYPES = {
  // Photo(s) uploaded by a customer
  photo: 'PHOTO',

  // A Human Solutions 3D body scan
  humanSolutions: 'HUMANSOLUTIONS'
};

function create(data, trx) {
  const rowData = Object.assign(
    {},
    compact(dataMapper.userDataToRowData(data)),
    { id: uuid.v4() }
  );

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .modify(query => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .catch(rethrow)
    .catch(
      filterError(rethrow.ERRORS.NotNullViolation, err => {
        if (err.column === 'type') {
          throw new InvalidDataError('Scan type must be provided');
        }

        throw err;
      })
    )
    .then(first)
    .then(instantiate);
}

/**
 * @returns {Promise}
 * @resolves {Object|null}
 */
function findById(id) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

/**
 * @returns {Promise}
 * @resolves {Array}
 */
function findByUserId(userId) {
  return db(TABLE_NAME)
    .where({ user_id: userId, deleted_at: null })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(scans => scans.map(instantiate));
}

function findAll({ limit, offset }) {
  if (typeof limit !== 'number' || typeof offset !== 'number') {
    throw new Error('Limit and offset must be provided to find all scans');
  }

  return db(TABLE_NAME)
    .select(
      'scans.*',
      'fit_partner_customers.shopify_user_id',
      'fit_partner_customers.phone'
    )
    .orderBy('created_at', 'desc')
    .limit(limit)
    .join(
      'fit_partner_customers',
      'scans.fit_partner_customer_id',
      'fit_partner_customers.id'
    )
    .offset(offset)
    .then(scans => scans.map(instantiateWithMeta));
}

async function findByFitPartner(userId, { limit, offset }) {
  if (typeof limit !== 'number' || typeof offset !== 'number') {
    throw new Error('Limit and offset must be provided to find all scans');
  }

  const result = await db
    .raw(
      `
select s.*
  from scans as s
    inner join fit_partner_customers as customers
      on customers.id = s.fit_partner_customer_id
    inner join fit_partners as fp
      on fp.id = customers.partner_id
    inner join users as u
      on u.id = fp.admin_user_id
  where u.id = ?
  order by s.created_at desc
  limit ?
  offset ?;
    `,
      [userId, limit, offset]
    )
    .catch(rethrow);

  const { rows } = result;
  return rows.map(instantiate);
}

function updateOneById(id, data) {
  return db(TABLE_NAME)
    .where({
      id,
      deleted_at: null
    })
    .update(
      compact({
        is_complete: data.isComplete,
        is_started: data.isStarted,
        measurements: data.measurements,
        user_id: data.userId
      }),
      '*'
    )
    .then(first)
    .then(instantiate);
}

function deleteById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .update(
      {
        deleted_at: new Date()
      },
      '*'
    )
    .then(first)
    .then(scan => {
      if (!scan) {
        throw new Error(`Could not find scan ${id} to delete`);
      }
      return scan;
    });
}

function findByFitPartnerCustomer(fitPartnerCustomerId) {
  return db(TABLE_NAME)
    .where({
      fit_partner_customer_id: fitPartnerCustomerId,
      deleted_at: null
    })
    .map(instantiate);
}

module.exports = {
  create,
  deleteById,
  findAll,
  findByFitPartner,
  findByFitPartnerCustomer,
  findById,
  findByUserId,
  SCAN_TYPES,
  updateOneById
};
