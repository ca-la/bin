'use strict';

const { AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME } = require('../config');
const { requireProperties } = require('../services/require-properties');

class ProductDesignImage {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.userId = row.user_id;
    this.originalHeightPx = row.original_height_px;
    this.originalWidthPx = row.original_width_px;
    this.title = row.title;
    this.description = row.description;
    this.mimeType = row.mime_type;
    this.uploadCompletedAt = row.upload_completed_at;
  }

  getUrl() {
    return `https://${AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME}.s3.amazonaws.com/${this.id}`;
  }

  toJSON() {
    return Object.assign({}, this, {
      url: this.getUrl()
    });
  }
}

module.exports = ProductDesignImage;
