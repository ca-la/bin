'use strict';

const DataMapper = require('../services/data-mapper');
const formatDateString = require('../services/format-date-string');
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
  sourcing_complexity: 'sourcingComplexity',
  pattern_complexity: 'patternComplexity',
  production_complexity: 'productionComplexity',
  sample_complexity: 'sampleComplexity',
  status: 'status',
  due_date: 'dueDate',
  expected_cost_cents: 'expectedCostCents'
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

    if (row.due_date instanceof Date) {
      this.dueDate = formatDateString(row.due_date);
    } else {
      this.dueDate = row.due_date;
    }
  }

  setOwner(owner) {
    this.owner = owner;
  }

  setCurrentStatus(status) {
    this.currentStatus = status;
  }

  setNextStatus(status) {
    this.nextStatus = status;
  }

  setPermissions(permissions) {
    this.permissions = permissions;
  }
}

ProductDesign.dataMapper = dataMapper;

module.exports = ProductDesign;
