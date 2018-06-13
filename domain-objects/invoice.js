'use strict';

const { requireProperties } = require('../services/require-properties');
const DataMapper = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  user_id: 'userId',
  total_cents: 'totalCents',
  title: 'title',
  description: 'description',
  design_id: 'designId',
  design_status_id: 'designStatusId',
  last_paid_at: 'lastPaidAt',
  is_paid: 'isPaid',
  total_paid: 'totalPaid',
  // TODO: remove these keys after final migration that drops the columns
  paid_at: 'paidAt',
  payment_method_id: 'paymentMethodId',
  stripe_charge_id: 'stripeChargeId',
  rumbleship_purchase_hash: 'rumbleshipPurchaseHash'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class Invoice {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at),
      lastPaidAt: row.last_paid_at && new Date(row.last_paid_at),
      paidAt: row.paid_at && new Date(row.paid_at)
    });
  }
}

Invoice.dataMapper = dataMapper;

module.exports = Invoice;
