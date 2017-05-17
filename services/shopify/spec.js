'use strict';

const { test, skip } = require('../../test-helpers/fresh');
const Shopify = require('./index');

// s/skip/test to test functionality
skip('getRedemptionCount', (t) => {
  return Shopify.getRedemptionCount('CHEAPO')
    .then(count => t.equal(count, 1));
});

// s/skip/test to test functionality
skip('createCustomer', (t) => {
  return Shopify.createCustomer({
    name: 'Dylan Pyle',
    phone: '+14155809922'
  })
    .then((customer) => {
      t.equal(customer.first_name, 'Dylan');
      t.equal(customer.last_name, 'Pyle');
      t.equal(customer.phone, '+14155809922');
    });
});

test('parseError parses string errors', (t) => {
  const errorMessage = Shopify.parseError('wowza');
  t.equal(errorMessage, 'wowza');
  return Promise.resolve();
});

test('parseError parses object errors', (t) => {
  const errorMessage = Shopify.parseError({
    phone: [
      'is invalid',
      'is very bad'
    ],
    name: [
      'also bad',
      'not good'
    ]
  });

  t.equal(errorMessage, 'phone is invalid, phone is very bad, name also bad, name not good');
  return Promise.resolve();
});

test('parseError parses object errors', (t) => {
  const errorMessage = Shopify.parseError({
    phone: 'no bueno'
  });

  t.equal(errorMessage, 'phone no bueno');
  return Promise.resolve();
});
