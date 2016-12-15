'use strict';

const Promise = require('bluebird');

const Shopify = require('../../services/shopify');
const { get } = require('../../test-helpers/http');
const { test, sandbox } = require('../../test-helpers/fresh');

test('GET /referral-codes/:code/redemption-count returns the redemption count', (t) => {
  sandbox().stub(Shopify, 'getRedemptionCount', () => Promise.resolve(15));

  return get('/referral-codes/123123/redemption-count')
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.deepEqual(body, { count: 15 });
    });
});
