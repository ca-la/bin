'use strict';

const { default: DataMapper } = require('../services/data-mapper');
const { requireProperties } = require('../services/require-properties');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  start_at: 'startAt',
  expected_end_at: 'expectedEndAt',
  actual_end_at: 'expectedEndAt',
  title: 'title',
  owner_user_id: 'ownerUserId',
  design_id: 'designId'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignEvent {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      startAt: new Date(row.start_at),
      expectedEndAt: new Date(row.expected_end_at),
      actualEndAt: row.actual_end_at && new Date(row.actual_end_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }
}

ProductDesignEvent.dataMapper = dataMapper;

module.exports = ProductDesignEvent;
