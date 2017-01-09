'use strict';

const requireProperties = require('../services/require-properties');

class ScanPhoto {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.scanId = row.scan_id;
    this.createdAt = new Date(row.created_at);
  }

  setUrl(url) {
    this.url = url;
  }
}

module.exports = ScanPhoto;
