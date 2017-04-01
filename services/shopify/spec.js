'use strict';

const { test, sandbox } = require('../../test-helpers/fresh');
const Shopify = require('./index');

test('getRedemptionCount', (t) => {
  // Comment out to test functionality
  sandbox().stub(Shopify, 'getRedemptionCount', () => Promise.resolve(1));

  return Shopify.getRedemptionCount('CHEAPO')
    .then(count => t.equal(count, 1));
});
