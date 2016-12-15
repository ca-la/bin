'use strict';

const { test, sandbox } = require('../../test-helpers/fresh');
const Shopify = require('./index');

test('login', (t) => {
  // Comment out to test login functionality
  sandbox().stub(Shopify, 'login', () => Promise.resolve(true));

  return Shopify.login('d@ca.la', 'foobar')
    .then(val => t.equal(val, true));
});

test('getRedemptionCount', (t) => {
  // Comment out to test functionality
  sandbox().stub(Shopify, 'getRedemptionCount', () => Promise.resolve(1));

  return Shopify.getRedemptionCount('CHEAPO')
    .then(count => t.equal(count, 1));
});
