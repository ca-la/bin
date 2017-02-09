'use strict';

const InvalidDataError = require('../../errors/invalid-data');

const MAX_WEIGHT_LBS = 2000;
const MIN_WEIGHT_LBS = 20;

function assertTypeIfExists(val, type, message) {
  if (val === undefined || val === null) {
    return;
  }

  // eslint-disable-next-line valid-typeof
  if (typeof val !== type) {
    throw new InvalidDataError(message);
  }
}

function assertRangeIfExists(val, min, max, message) {
  if (val === undefined || val === null) {
    return;
  }

  if (val < min || val > max) {
    throw new InvalidDataError(message);
  }
}

/**
 * Ensure that the `measurements` data on a scan is well-formed
 * @param {Object} measurements
 * @throws {InvalidDataError}
 */
function validateMeasurements(measurements) {
  if (!measurements) {
    return;
  }

  assertTypeIfExists(measurements.weightLbs, 'number', 'Weight must be a number');
  assertTypeIfExists(measurements.heightInches, 'number', 'Height must be a number');

  assertRangeIfExists(
    measurements.weightLbs,
    MIN_WEIGHT_LBS,
    MAX_WEIGHT_LBS,
    'Invalid weight value'
  );
}

module.exports = validateMeasurements;
