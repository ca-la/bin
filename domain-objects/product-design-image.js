'use strict';

const { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME } = require('../config');
const { requireProperties } = require('../services/require-properties');

class ProductDesignImage {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.userId = row.user_id;
  }

  getUrl() {
    return `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/${this.id}`;
  }

  toJSON() {
    return {
      id: this.id,
      createdAt: this.createdAt,
      userId: this.userId,
      url: this.getUrl()
    };
  }
}

module.exports = ProductDesignImage;
