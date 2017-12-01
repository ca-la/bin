'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  design_id: 'designId',
  vendor_user_id: 'vendorUserId'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignService {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data);
  }
}

ProductDesignService.dataMapper = dataMapper;

module.exports = ProductDesignService;
