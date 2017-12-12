'use strict';

const { requireValues } = require('../require-properties');

// Statuses controlled by CALA & partners, not the designer
const productionStatuses = [
  'IN_REVIEW',
  'DEVELOPMENT',
  'SAMPLE_PRODUCTION',
  'PRE_PRODUCTION',
  'PRODUCTION',
  'FULFILLMENT'
];

function canCompleteStatus(
  status,
  isPartnerOrAdmin
) {
  requireValues({ status, isPartnerOrAdmin });

  if (status === 'COMPLETE') {
    return false;
  }

  if (productionStatuses.indexOf(status) > -1) {
    return isPartnerOrAdmin;
  }

  return true;
}

module.exports = canCompleteStatus;
