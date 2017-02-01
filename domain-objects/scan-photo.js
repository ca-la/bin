'use strict';

const requireProperties = require('../services/require-properties');
const { AWS_SCANPHOTO_BUCKET_NAME } = require('../services/config');

class ScanPhoto {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.scanId = row.scan_id;
    this.createdAt = new Date(row.created_at);
  }

  toJSON() {
    return {
      id: this.id,
      scanId: this.scanId,
      createdAt: this.createdAt,
      url: `https://s3.amazonaws.com/${AWS_SCANPHOTO_BUCKET_NAME}/${this.id}.jpg`
    };
  }
}

module.exports = ScanPhoto;
