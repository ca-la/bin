'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesignSection {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.panelData = row.panel_data;
    this.customImageId = row.custom_image_id;
    this.designId = row.design_id;
    this.templateName = row.template_name;
  }
}

module.exports = ProductDesignSection;
