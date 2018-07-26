'use strict';

const { requireProperties } = require('../services/require-properties');
const { default: DataMapper } = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  invoice_id: 'invoiceId',
  invoice_amount_cents: 'invoiceAmountCents',
  invoice_margin_cents: 'invoiceMarginCents',
  stripe_fee_cents: 'stripeFeeCents',
  cost_of_services_cents: 'costOfServicesCents',
  total_profit_cents: 'totalProfitCents',
  pricing_table_data: 'pricingTableData'
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
