'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesignFeaturePlacement {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.sectionId = row.section_id;
    this.imageId = row.image_id;
    this.zIndex = row.z_index;
    this.x = row.x;
    this.y = row.y;
    this.height = row.height;
    this.width = row.width;
    this.rotation = row.rotation;
    this.type = row.type;
  }
}

module.exports = ProductDesignFeaturePlacement;
