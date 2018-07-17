'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  invoice_id: 'invoice_id',
  total_cents: 'totalCents',
  payment_method_id: 'paymentMethodId',
  stripe_charge_id: 'stripeChargeId',
  rumbleship_purchase_hash: 'rumbleshipPurchaseHash'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class InvoicePayment {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at)
    });
  }
}

InvoicePayment.dataMapper = dataMapper;

module.exports = InvoicePayment;
