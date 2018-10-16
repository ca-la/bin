'use strict';

const { requireProperties } = require('../services/require-properties');
const { default: DataMapper } = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  design_id: 'designId',
  user_id: 'userId',
  user_email: 'userEmail',
  invitation_message: 'invitationMessage',
  role: 'role',
  created_at: 'createdAt',
  deleted_at: 'deletedAt'
};

const ROLES = {
  edit: 'EDIT',
  view: 'VIEW',
  comment: 'COMMENT'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class Collaborator {
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

Collaborator.dataMapper = dataMapper;
Collaborator.ROLES = ROLES;

module.exports = Collaborator;
