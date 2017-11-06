'use strict';

const DataMapper = require('../services/data-mapper');
const { requireProperties } = require('../services/require-properties');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  title: 'title',
  description: 'description',
  product_type: 'productType',
  metadata: 'metadata',
  user_id: 'userId',

  // string[] - urls of each section preview
  preview_image_urls: 'previewImageUrls',
  override_pricing_table: 'overridePricingTable',
  computed_pricing_table: 'computedPricingTable',
  retail_price_cents: 'retailPriceCents',
  units_to_produce: 'unitsToProduce',
  sourcing_complexity: 'sourcingComplexity',
  pattern_complexity: 'patternComplexity',
  status: 'status'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesign {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }

  setOwner(owner) {
    this.owner = owner;
  }
}

ProductDesign.dataMapper = dataMapper;

module.exports = ProductDesign;
