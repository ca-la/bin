'use strict';

const DataMapper = require('../services/data-mapper');
const formatDateString = require('../services/format-date-string');
const { requireProperties } = require('../services/require-properties');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  design_id: 'designId',
  status_id: 'statusId',
  estimated_completion_date: 'estimatedCompletionDate'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignStatusSla {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      estimatedCompletionDate: formatDateString(row.estimated_completion_date)
    });
  }
}

ProductDesignStatusSla.dataMapper = dataMapper;

module.exports = ProductDesignStatusSla;
