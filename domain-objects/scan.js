'use strict';

const { requireProperties } = require('../services/require-properties');

class Scan {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.isComplete = row.is_complete;
    this.measurements = row.measurements;
    this.type = row.type;
    this.userId = row.user_id;
    this.createdAt = new Date(row.created_at);

    this.deletedAt = row.deleted_at && new Date(row.deleted_at);
  }
}

module.exports = Scan;
