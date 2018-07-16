'use strict';

const { requireProperties } = require('../services/require-properties');

class Session {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.userId = row.user_id;
    this.createdAt = new Date(row.created_at);
    this.role = row.role;
    this.expiresAt = row.expires_at && new Date(row.expires_at);
  }

  setUser(user) {
    this.user = user;
  }
}

module.exports = Session;
