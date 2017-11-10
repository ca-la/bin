'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  sla_description: 'slaDescription',
  next_status: 'nextStatus',
  label: 'label',
  action_name: 'actionName'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignStatus {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);
    Object.assign(this, data);
  }
}

ProductDesignStatus.dataMapper = dataMapper;

module.exports = ProductDesignStatus;
