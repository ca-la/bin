'use strict';

const random = require('lodash/random');

const { test, skip } = require('../../test-helpers/fresh');
const ShopifyClient = require('./index');

// Run these tests with RUN_SHOPIFY_TESTS=true to run the integration tests
// against a real Shopify store.
const testRunner = (process.env.RUN_SHOPIFY_TESTS === 'true') ? test : skip;
const calaClient = new ShopifyClient(ShopifyClient.CALA_STORE_CREDENTIALS);

function getPhone() {
  let memo = '+1415580';
  for (let i = 0; i < 4; i += 1) {
    memo += random(0, 9);
  }
  return memo;
}

const phone1 = getPhone();

testRunner('getRedemptionCount', (t) => {
  return calaClient.getRedemptionCount('CHEAPO')
    .then(count => t.equal(count, 1));
});

testRunner('createCustomer', async (t) => {
  const customer = await calaClient.createCustomer({
    name: 'Customer Name',
    phone: phone1
  });

  t.equal(customer.first_name, 'Customer');
  t.equal(customer.last_name, 'Name');
  t.equal(customer.phone, phone1);
});

testRunner('updateCustomerByPhone', (t) => {
  return calaClient.updateCustomerByPhone(phone1, {
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
        phone: phone1,
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

testRunner('getCollects', (t) => {
  return calaClient.getCollects()
    .then((collects) => {
      t.equal(typeof collects[0].product_id, 'number');
    });
});

test('parseError parses string errors', async (t) => {
  const errorMessage = ShopifyClient.parseError('wowza');
  t.equal(errorMessage, 'wowza');
});

test('parseError parses object errors', async (t) => {
  const errorMessage = ShopifyClient.parseError({
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
});

test('parseError parses object errors', async (t) => {
  const errorMessage = ShopifyClient.parseError({
    phone: 'no bueno'
  });

  t.equal(errorMessage, 'phone no bueno');
});
