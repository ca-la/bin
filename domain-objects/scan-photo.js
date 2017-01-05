'use strict';

const requireProperties = require('../services/require-properties');

class ScanPhoto {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.scanId = row.scan_id;
  }
}

module.exports = ScanPhoto;
