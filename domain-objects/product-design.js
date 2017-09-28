'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesign {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.description = row.description;
    this.title = row.title;
    this.productType = row.product_type;
    this.metadata = row.metadata;
    this.userId = row.user_id;

    // An array of URLs
    this.previewImageUrls = row.preview_image_urls;
  }
}

module.exports = ProductDesign;
