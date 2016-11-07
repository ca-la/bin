'use strict';

const requireProperties = require('../services/require-properties');

class Session {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.userId = row.user_id;
    this.createdAt = new Date(row.created_at);
  }
}

module.exports = Session;
