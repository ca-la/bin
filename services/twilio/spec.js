'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const Twilio = require('./index');
const { test, skip } = require('../../test-helpers/fresh');

const ok = Promise.resolve();

// Replace `skip` with `test` to send real SMS...
skip('Twilio.sendSMS sends SMS messages', () => {
  return Twilio.sendSMS('+14155809925', 'This is a test, this is only a test.');
});

test('Twilio.sendSMS rejects invalid number', (t) => {
  t.throws(() => {
    Twilio.sendSMS('+1411', 'Whoops');
  }, InvalidDataError);

  return ok;
});
