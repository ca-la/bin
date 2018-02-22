'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  invoice_id: 'invoiceId',
  payout_account_id: 'payoutAccountId',
  payout_acount_cents: 'payoutAmountCents',
  message: 'message',
  initiator_user_id: 'initiatorUserId'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class PartnerPayoutLog {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at)
    });
  }
}

PartnerPayoutLog.dataMapper = dataMapper;

module.exports = PartnerPayoutLog;
