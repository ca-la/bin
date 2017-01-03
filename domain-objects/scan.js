'use strict';

const requireProperties = require('../services/require-properties');

class Scan {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.userId = row.user_id;
    this.type = row.type;
    this.measurements = row.measurements;
  }
}

module.exports = Scan;
