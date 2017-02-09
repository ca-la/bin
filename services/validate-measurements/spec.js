'use strict';

const { test } = require('../../test-helpers/fresh');
const validateMeasurements = require('./index');
const InvalidDataError = require('../../errors/invalid-data');

const ok = Promise.resolve();

test('validateMeasurements allows valid values', () => {
  const values = [
    null,
    {},
    { heightInches: 10 },
    { weightLbs: 100 }
  ];

  values.map(validateMeasurements);

  return ok;
});

test('validateMeasurements disallows invalid values', (t) => {
  t.throws(() => {
    validateMeasurements({
      heightInches: 'very'
    });
  }, InvalidDataError);

  t.throws(() => {
    validateMeasurements({
      weightLbs: 9999
    });
  }, InvalidDataError);

  return ok;
});
