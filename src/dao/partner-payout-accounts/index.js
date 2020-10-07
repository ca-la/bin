"use strict";

const rethrow = require("pg-rethrow");
const uuid = require("node-uuid");

const db = require("../../services/db");
const first = require("../../services/first").default;
const PartnerPayoutAccount = require("../../domain-objects/partner-payout-account");

const instantiate = (row) => new PartnerPayoutAccount(row);
const maybeInstantiate = (data) =>
  (data && new PartnerPayoutAccount(data)) || null;

const { dataMapper } = PartnerPayoutAccount;

const TABLE_NAME = "partner_payout_accounts";

async function findById(id, trx) {
  return db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then(first)
    .then(maybeInstantiate);
}

async function findByUserId(userId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      user_id: userId,
    })
    .then((payoutAccounts) => payoutAccounts.map(instantiate))
    .catch(rethrow);
}

async function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4(),
  });

  return db(TABLE_NAME)
    .insert(rowData, "*")
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

module.exports = {
  findById,
  findByUserId,
  create,
};
