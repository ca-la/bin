'use strict';

const { requireValues } = require('../require-properties');

// Statuses controlled by CALA & partners, not the designer
const PRODUCTION_STATUSES = [
  'IN_REVIEW',
  'DEVELOPMENT',
  'SAMPLE_PRODUCTION',
  'PRE_PRODUCTION',
  'PRODUCTION',
  'FULFILLMENT'
];

// Nobody can complete a payment status except admins - they become complete as
// a side-effect of the outstanding invoice being paid
const PAYMENT_STATUSES = [
  'NEEDS_DEVELOPMENT_PAYMENT',
  'NEEDS_PRODUCTION_PAYMENT',
  'NEEDS_FULFILLMENT_PAYMENT'
];

function canCompleteStatus(
  status,
  isPartner,
  isAdmin
) {
  requireValues({ status, isPartner, isAdmin });

  if (status === 'COMPLETE') {
    return false;
  }

  if (PRODUCTION_STATUSES.indexOf(status) > -1) {
    return isPartner || isAdmin;
  }

  if (PAYMENT_STATUSES.indexOf(status) > -1) {
    return isAdmin;
  }

  return true;
}

module.exports = canCompleteStatus;
