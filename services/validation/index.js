'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const {
  PhoneNumberUtil,
  PhoneNumberFormat
} = require('google-libphonenumber');

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
  * @returns {String} An e164-formatted number, if validation passed
  */
function validateAndFormatPhoneNumber(number) {
  let adjustedNumber = number;

  if (
    number.indexOf('+') === -1 &&
    number.replace(/[^\d]/g, '').length === 10
  ) {
    // Assume domestic without +1 prefix
    adjustedNumber = `+1 ${number}`;
  }

  const util = PhoneNumberUtil.getInstance();

  let parsedNumber;

  try {
    parsedNumber = util.parse(adjustedNumber);
  } catch (err) {
    throw new InvalidDataError(err.message);
  }

  if (!util.isValidNumber(parsedNumber)) {
    throw new InvalidDataError(`Invalid phone number: ${number}`);
  }

  return util.format(parsedNumber, PhoneNumberFormat.E164);
}


const EMAIL_PATTERN = /^[^@]+@[^@]+\.[^@]+$/;

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

module.exports = {
  assertRangeIfExists,
  assertTypeIfExists,
  isValidEmail,
  validateAndFormatPhoneNumber
};
