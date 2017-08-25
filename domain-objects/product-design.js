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
    this.productOptions = row.product_options;
    this.userId = row.user_id;

    // SVG representation of a preview of the design. Managed by the client for
    // now.
    this.previewImageData = row.preview_image_data;
  }
}

module.exports = ProductDesign;
