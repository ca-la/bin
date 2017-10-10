'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  design_id: 'designId',
  user_id: 'userId',
  user_email: 'userEmail',
  role: 'role'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignCollaborator {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }

  setUser(user) {
    this.user = user;
  }
}

ProductDesignCollaborator.dataMapper = dataMapper;

module.exports = ProductDesignCollaborator;
