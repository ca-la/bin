'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesignSection {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.designId = row.design_id;
    this.customImageId = row.custom_image_id;
  }
}

module.exports = ProductDesignSection;
