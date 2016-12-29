'use strict';

const { test } = require('../../test-helpers/fresh');
const shouldAllowAppointment = require('./index');
const config = require('../config');

const ok = Promise.resolve();

let previousZip;

function beforeEach() {
  previousZip = config.PRIVATE_APPOINTMENT_ZIP;
  config.PRIVATE_APPOINTMENT_ZIP = '94117';
}

function afterEach() {
  config.PRIVATE_APPOINTMENT_ZIP = previousZip;
}

test('shouldAllowAppointment returns true for customers in range', (t) => {
  beforeEach();

  t.equal(shouldAllowAppointment('94117'), true); // San Francisco, CA
  t.equal(shouldAllowAppointment('94115'), true); // San Francisco, CA
  t.equal(shouldAllowAppointment('95123'), true); // San Jose, CA

  afterEach();
  return ok;
});


test('shouldAllowAppointment returns false for customers out of range', (t) => {
  beforeEach();

  t.equal(shouldAllowAppointment('01950'), false); // Newburyport, MA
  t.equal(shouldAllowAppointment('90064'), false); // Los Angeles, CA

  afterEach();
  return ok;
});

