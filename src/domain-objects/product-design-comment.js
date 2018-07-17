'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  user_id: 'userId',
  section_id: 'sectionId',
  parent_comment_id: 'parentCommentId',
  text: 'text',
  is_pinned: 'isPinned'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesignComment {
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

ProductDesignComment.dataMapper = dataMapper;

module.exports = ProductDesignComment;
