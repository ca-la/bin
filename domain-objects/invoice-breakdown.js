'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  invoice_id: 'invoiceId',
  total_revenue_cents: 'totalRevenueCents',
  total_cost_cents: 'totalCostCents',
  total_profit_cents: 'totalProfitCents',
  stripe_fee_cents: 'stripeFeeCents'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class InvoiceBreakdown {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data);
  }
}

InvoiceBreakdown.dataMapper = dataMapper;

module.exports = InvoiceBreakdown;
