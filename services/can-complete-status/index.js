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
  isProductionPartner
) {
  requireValues({ status, isProductionPartner });

  if (status === 'COMPLETE') {
    return false;
  }

  if (productionStatuses.indexOf(status) > -1) {
    return isProductionPartner;
  }

  return true;
}

module.exports = canCompleteStatus;
