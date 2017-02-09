'use strict';

const InvalidDataError = require('../../errors/invalid-data');

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

function assertDomesticNumber(val) {
  const pattern = /^\+1\d{10}$/;

  if (!pattern.test(val)) {
    throw new InvalidDataError('Invalid phone number');
  }
}

module.exports = {
  assertDomesticNumber,
  assertTypeIfExists,
  assertRangeIfExists
};
