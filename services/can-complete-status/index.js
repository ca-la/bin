'use strict';

const { PRODUCTION_STATUSES, PAYMENT_STATUSES } = require('../../config/design-statuses');
const { requireValues } = require('../require-properties');

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
