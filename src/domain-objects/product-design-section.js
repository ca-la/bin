"use strict";

const { requireProperties } = require("../services/require-properties");

class ProductDesignSection {
  constructor(row) {
    requireProperties(row, "id");

    this.id = row.id;
    this.type = row.type;
    this.createdAt = new Date(row.created_at);
    this.customData = row.custom_data;
    this.panelData = row.panel_data;
    this.title = row.title;
    this.customImageId = row.custom_image_id;
    this.designId = row.design_id;
    this.templateName = row.template_name;

    // Technically losing precision here, but the client is JavaScript too so
    // `Number` is as good as it's gonna get. See knex/issues/927
    this.position = Number(row.position);
  }
}

module.exports = ProductDesignSection;
