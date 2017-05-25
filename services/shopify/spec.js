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

// s/skip/test to test functionality
skip('updateCustomerByPhone', (t) => {
  return Shopify.updateCustomerByPhone('+14155809925', {
    last_name: 'Something',
    first_name: 'Someone',
    email: 'someone@example.com',
    addresses: [
      {
        default: true,
        address1: '1025 Oak st',
        address2: 'B',
        company: 'CALA',
        city: 'San Francisco',
        province: 'California',
        phone: '+14155809925',
        zip: '94117',
        last_name: 'Something',
        first_name: 'Someone'
      }
    ]
  })
    .then((customer) => {
      t.equal(customer.first_name, 'Someone');
      t.equal(customer.last_name, 'Something');
      t.equal(customer.addresses[0].address1, '1025 Oak st');
    });
});

skip('getCollects', (t) => {
  return Shopify.getCollects()
    .then((collects) => {
      t.equal(typeof collects[0].product_id, 'number');
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
