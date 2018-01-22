'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class DesignStatusSla {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at)
    });
  }
}

DesignStatusSla.dataMapper = dataMapper;

module.exports = DesignStatusSla;
