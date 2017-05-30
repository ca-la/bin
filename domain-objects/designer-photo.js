'use strict';

const { requireProperties } = require('../services/require-properties');

class DesignerPhoto {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.designerId = row.designer_id;
    this.photoUrl = row.photo_url;
  }
}

module.exports = DesignerPhoto;
