'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesignImage {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.designId = row.design_id;
  }
}

module.exports = ProductDesignImage;
