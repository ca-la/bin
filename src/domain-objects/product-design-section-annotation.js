'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesignSectionAnnotation {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.sectionId = row.section_id;
    this.x = row.x;
    this.y = row.y;
    this.text = row.text;
    this.deletedAt = row.deleted_at && new Date(row.deleted_at);
    this.inReplyToId = row.in_reply_to_id;
    this.userId = row.user_id;
  }

  setUser(user) {
    this.user = user;
  }
}

module.exports = ProductDesignSectionAnnotation;
