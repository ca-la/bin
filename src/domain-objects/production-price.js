'use strict';

const { requireProperties } = require('../services/require-properties');
const { default: DataMapper } = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  vendor_user_id: 'vendorUserId',
  service_id: 'serviceId',
  minimum_units: 'minimumUnits',
  complexity_level: 'complexityLevel',
  price_cents: 'priceCents',
  setup_cost_cents: 'setupCostCents',
  price_unit: 'priceUnit'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class ProductionPrice {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at)
    });
  }
}

ProductionPrice.dataMapper = dataMapper;

module.exports = ProductionPrice;