'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesign {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.title = row.title;
    this.productType = row.product_type;
    this.productOptions = row.product_options;
    this.userId = row.user_id;
  }
}

module.exports = ProductDesign;
