'use strict';

const config = require('../config');
const zipcodes = require('zipcodes');

const APPOINTMENT_THRESHOLD_MILES = 50;

/**
 * Determine whether a new customer in a given zip code should be elgible to
 * schedule a private appointment directly with CALA. This is based on whether
 * we're currently accepting private appointments close to them.
 *
 * @param {String} customerZipCode
 * @returns {Boolean}
 */
function shouldAllowAppointment(customerZipCode) {
  const distance = zipcodes.distance(config.PRIVATE_APPOINTMENT_ZIP, customerZipCode);

  return (distance <= APPOINTMENT_THRESHOLD_MILES);
}

module.exports = shouldAllowAppointment;
