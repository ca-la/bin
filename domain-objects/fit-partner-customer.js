'use strict';

const DataMapper = require('../services/data-mapper');
const { requireProperties } = require('../services/require-properties');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  partner_id: 'partnerId',
  shopify_user_id: 'shopifyUserId'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class FitPartnerCustomer {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at)
    });
  }
}

FitPartnerCustomer.dataMapper = dataMapper;

module.exports = FitPartnerCustomer;
