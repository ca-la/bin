'use strict';

const { default: DataMapper } = require('../services/data-mapper');
const { requireProperties } = require('../services/require-properties');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  company_name: 'companyName',

  address_line_1: 'addressLine1',
  address_line_2: 'addressLine2',
  city: 'city',
  region: 'region',
  post_code: 'postCode',
  country: 'country',
  user_id: 'userId'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class Address {
  constructor(row) {
    requireProperties(row, 'id');
    const data = dataMapper.rowDataToUserData(row);
    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }
}

Address.dataMapper = dataMapper;

module.exports = Address;
