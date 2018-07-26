'use strict';

const { requireProperties } = require('../services/require-properties');
const { default: DataMapper } = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  user_id: 'userId',
  stripe_access_token: 'stripeAccessToken',
  stripe_refresh_token: 'stripeRefreshToken',
  stripe_publishable_key: 'stripePublishableKey',
  stripe_user_id: 'stripeUserId'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class PartnerPayoutAccount {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }
}

PartnerPayoutAccount.dataMapper = dataMapper;

module.exports = PartnerPayoutAccount;
