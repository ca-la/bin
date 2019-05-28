'use strict';

const { assertTypeIfExists, assertRangeIfExists } = require('../validation');

const MAX_WEIGHT_LBS = 2000;
const MIN_WEIGHT_LBS = 20;

/**
 * Ensure that the `measurements` data on a scan is well-formed
 * @param {Object} measurements
 * @throws {InvalidDataError}
 */
function validateMeasurements(measurements) {
  if (!measurements) {
    return;
  }

  assertTypeIfExists(
    measurements.weightLbs,
    'number',
    'Weight must be a number'
  );
  assertTypeIfExists(
    measurements.heightInches,
    'number',
    'Height must be a number'
  );

  assertRangeIfExists(
    measurements.weightLbs,
    MIN_WEIGHT_LBS,
    MAX_WEIGHT_LBS,
    'Invalid weight value'
  );
}

module.exports = validateMeasurements;
