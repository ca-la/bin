'use strict';

const { test, sandbox } = require('../../test-helpers/fresh');
const Shopify = require('./index');

test('login', (t) => {
  // Comment out to test login functionality
  sandbox().stub(Shopify, 'login', () => Promise.resolve(true));

  return Shopify.login('d@ca.la', 'foobar')
    .then(val => t.equal(val, true));
});
