'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const db = require('../../services/db');
const first = require('../../services/first');
const PartnerPayoutLog = require('../../domain-objects/partner-payout-log');

const instantiate = row => new PartnerPayoutLog(row);

const { dataMapper } = PartnerPayoutLog;

const TABLE_NAME = 'partner_payout_logs';

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

async function findByPayoutAccountId(payoutAccountId) {
  return db(TABLE_NAME)
    .where({
      payout_account_id: payoutAccountId
    })
    .orderBy('created_at', 'desc')
    .then(logs => logs.map(instantiate))
    .catch(rethrow);
}

module.exports = {
  create,
  findByPayoutAccountId
};
