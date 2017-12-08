
'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  design_id: 'designId',
  created_at: 'createdAt',
  color_name: 'colorName',
  size_name: 'sizeName'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignVariant {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at)
    });
  }
}

ProductDesignVariant.dataMapper = dataMapper;

module.exports = ProductDesignVariant;
