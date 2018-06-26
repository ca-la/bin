'use strict';

const DataMapper = require('../services/data-mapper');
const { requireProperties } = require('../services/require-properties');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  created_by: 'createdBy',
  title: 'title',
  description: 'description'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class Collection {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }
}

Collection.dataMapper = dataMapper;

module.exports = Collection;
