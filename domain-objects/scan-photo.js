'use strict';

const { requireProperties } = require('../services/require-properties');

class ScanPhoto {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.scanId = row.scan_id;
    this.createdAt = new Date(row.created_at);
    this.deletedAt = row.deleted_at && new Date(row.deleted_at);
    this.calibrationData = row.calibration_data;
    this.controlPoints = row.control_points;
  }

  setUrl(url) {
    this.url = url;
  }

  toJSON() {
    return {
      id: this.id,
      scanId: this.scanId,
      createdAt: this.createdAt,
      url: this.url
    };
  }
}

module.exports = ScanPhoto;
