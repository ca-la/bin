'use strict';

const omit = require('lodash/omit');

const { requireProperties } = require('../../services/require-properties');
const { default: DataMapper } = require('../../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  user_id: 'userId',
  stripe_customer_id: 'stripeCustomerId',
  stripe_source_id: 'stripeSourceId',
  last_four_digits: 'lastFourDigits'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class PaymentMethod {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }

  toJSON() {
    return omit(this, 'stripeCustomerId', 'stripeSourceId');
  }
}

PaymentMethod.dataMapper = dataMapper;

module.exports = PaymentMethod;
