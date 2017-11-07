'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  design_id: 'designId',
  user_id: 'userId',
  new_status: 'newStatus'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignStatusUpdate {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at)
    });
  }
}

ProductDesignStatusUpdate.dataMapper = dataMapper;

module.exports = ProductDesignStatusUpdate;
