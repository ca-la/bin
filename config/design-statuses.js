'use strict';

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

module.exports = {
  PRODUCTION_STATUSES,
  PAYMENT_STATUSES
};
