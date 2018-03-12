'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesignComment {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.sectionId = row.section_id;
    this.text = row.text;
    this.deletedAt = row.deleted_at && new Date(row.deleted_at);
    this.parentCommentId = row.parent_comment_id;
    this.userId = row.user_id;
  }

  setUser(user) {
    this.user = user;
  }
}

module.exports = ProductDesignComment;
