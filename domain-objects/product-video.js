'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductVideo {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.productId = row.product_id;
    this.videoUrl = row.video_url;
  }
}

module.exports = ProductVideo;
