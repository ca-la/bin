'use strict';

const { default: DataMapper } = require('../services/data-mapper');
const formatDateString = require('../services/format-date-string');
const { requireProperties } = require('../services/require-properties');
const { generatePreviewLinks } = require('../services/attach-asset-links');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  product_type: 'productType',
  title: 'title',
  description: 'description',
  metadata: 'metadata',
  user_id: 'userId',

  image_ids: 'imageIds',

  // string[] - urls of each section preview
  preview_image_urls: 'previewImageUrls',
  collections: 'collections',
  override_pricing_table: 'overridePricingTable',
  computed_pricing_table: 'computedPricingTable',
  retail_price_cents: 'retailPriceCents',

  status: 'status',
  due_date: 'dueDate',
  expected_cost_cents: 'expectedCostCents',
  show_pricing_breakdown: 'showPricingBreakdown'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductDesign {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);
    const imageLinks = generatePreviewLinks(data.imageIds);
    const previewImageUrls = imageLinks.map((imageLink) => {
      return imageLink.previewLink;
    });

    Object.assign(this, data, {
      collectionIds: data.collections.map(collection => collection.id),
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at),
      imageLinks,
      previewImageUrls
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

  setRole(role) {
    this.role = role;
  }
}

ProductDesign.dataMapper = dataMapper;

module.exports = ProductDesign;
