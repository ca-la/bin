'use strict';

const { default: DataMapper } = require('../services/data-mapper');
const { MINIMUM_SCAN_PITCH_RADIANS } = require('../config');
const { requireProperties } = require('../services/require-properties');

const keyNamesByColumnName = {
  id: 'id',
  created_at: 'createdAt',
  deleted_at: 'deletedAt',
  is_complete: 'isComplete',
  measurements: 'measurements',
  type: 'type',
  user_id: 'userId',
  fit_partner_customer_id: 'fitPartnerCustomerId'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class Scan {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at && new Date(row.deleted_at),
      minimumPitchRadians: MINIMUM_SCAN_PITCH_RADIANS
    });
  }
}

Scan.dataMapper = dataMapper;

module.exports = Scan;
