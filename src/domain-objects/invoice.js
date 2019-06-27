'use strict';

const { requireProperties } = require('../services/require-properties');
const { default: DataMapper } = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  user_id: 'userId',
  total_cents: 'totalCents',
  title: 'title',
  description: 'description',
  design_id: 'designId',
  collection_id: 'collectionId',
  design_status_id: 'designStatusId',
  is_paid: 'isPaid',
  total_paid: 'totalPaid',
  paid_at: 'paidAt',
  short_id: 'shortId'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class Invoice {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      // TODO: When BigInt support lands in Node, cast to BigInt instead
      totalPaid: row.total_paid ? parseInt(row.total_paid, 10) : 0,
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at),
      paidAt: row.paid_at && new Date(row.paid_at)
    });
  }
}

Invoice.dataMapper = dataMapper;

module.exports = Invoice;
