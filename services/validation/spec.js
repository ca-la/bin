'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const { isValidEmail, validateAndFormatPhoneNumber } = require('./index');
const { test } = require('../../test-helpers/fresh');

const ok = Promise.resolve();

test('validateAndFormatPhoneNumber allows valid numbers, returns E164', (t) => {
  t.equal(
    validateAndFormatPhoneNumber('+14155809925'),
    '+14155809925'
  );

  t.equal(
    validateAndFormatPhoneNumber('+44 0118 978 0006'),
    '+441189780006'
  );

  t.equal(
    validateAndFormatPhoneNumber('+1 (978) 255 - 0031'),
    '+19782550031'
  );

  t.equal(
    validateAndFormatPhoneNumber('415 580 9925'),
    '+14155809925'
  );

  return ok;
});

test('validateAndFormatPhoneNumber disallows invalid numbers', (t) => {
  t.throws(
    () => validateAndFormatPhoneNumber('+1 415 580 ****'),
    InvalidDataError
  );

  t.throws(
    () => validateAndFormatPhoneNumber('+1 415'),
    InvalidDataError
  );

  t.throws(
    () => validateAndFormatPhoneNumber('415 580 9925 2'),
    InvalidDataError
  );

  return ok;
});

test('isValidEmail naively validates emails', (t) => {
  t.equal(isValidEmail('d@ca.la'), true);
  t.equal(isValidEmail('someone.special+alot@example.com'), true);
  t.equal(isValidEmail('dylan@cala'), false);
  return ok;
});
