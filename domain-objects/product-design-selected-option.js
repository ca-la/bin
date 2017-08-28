'use strict';

const { requireProperties } = require('../services/require-properties');

class ProductDesignSelectedOption {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.deletedAt = row.deleted_at && new Date(row.deleted_at);
    this.designId = row.design_id;

    // As of 2017-08-28, panel IDs are created client-side and stored in
    // freeform JSON, so there's no DB-level enforcement of foreign keys.
    this.panelId = row.panel_id;
    this.optionId = row.option_id;
    this.unitsRequiredPerGarment = row.units_required_per_garment;
  }
}

module.exports = ProductDesignSelectedOption;
