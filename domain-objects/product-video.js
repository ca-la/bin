'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductVideo {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.productId = row.product_id;
    this.videoUrl = row.video_url;
    this.posterImageUrl = row.poster_image_url;
  }
}

module.exports = ProductVideo;
