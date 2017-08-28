'use strict';

const { requireProperties } = require('../services/require-properties');

// A ProductDesignOption is either a fabric or a trim in a user's "option
// library". When chosen for a specific garment, a record is created in the
// product_design_selected_options xref table tying the two together.
class ProductDesignOption {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.createdAt = new Date(row.created_at);
    this.deletedAt = row.deleted_at && new Date(row.deleted_at);

    // rows should have userId if customer-created, or isBuiltinOption=true if
    // CALA-created. not both
    this.userId = row.user_id;
    this.isBuiltinOption = row.is_builtin_option;

    this.unitCostCents = row.unit_cost_cents;

    // e.g. 'yard', 'meter', etc
    this.preferredCostUnit = row.preferred_cost_unit;

    // weight of a fabric in grams/square meter
    this.weightGsm = row.weight_gsm;

    // e.g. gsm, oz/sqft, etc
    this.preferredWeightUnit = row.preferred_weight_unit;
    this.title = row.title;
    this.sku = row.sku;
    this.previewImageId = row.preview_image_id;
    this.patternImageId = row.pattern_image_id;
    this.vendorName = row.vendor_name;
  }
}

module.exports = ProductDesignOption;
