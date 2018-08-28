'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first').default;
const FitPartnerCustomer = require('../../domain-objects/fit-partner-customer');
const { requireValues } = require('../../services/require-properties');

const instantiate = data => new FitPartnerCustomer(data);
const maybeInstantiate = data => (data ? instantiate(data) : null);

const { dataMapper } = FitPartnerCustomer;
const TABLE_NAME = 'fit_partner_customers';

function findById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

function findComplexTrx(trx, criteria) {
  requireValues({ trx, criteria });

  const rowData = compact(dataMapper.userDataToRowData(criteria));

  return db(TABLE_NAME)
    .transacting(trx)
    .where(rowData, '*')
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow);
}

function createTrx(trx, data) {
  requireValues({ trx, data });

  const rowData = Object.assign(
    {},
    compact(dataMapper.userDataToRowData(data)),
    { id: uuid.v4() }
  );

  return db(TABLE_NAME)
    .transacting(trx)
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

async function findOrCreate({ partnerId, shopifyUserId }) {
  requireValues({ partnerId, shopifyUserId });

  return db.transaction(async (trx) => {
    const found = await findComplexTrx(trx, { partnerId, shopifyUserId });
    if (found) { return found; }

    const created = await createTrx(trx, { partnerId, shopifyUserId });
    return created;
  });
}

module.exports = {
  findById,
  findOrCreate
};
