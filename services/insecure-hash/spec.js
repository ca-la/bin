'use strict';

const { test } = require('../../test-helpers/fresh');
const insecureHash = require('./index');

test('insecureHash returns the same value when called multiple times', async (t) => {
  const res1 = insecureHash('Hello World');
  const res2 = insecureHash('Hello World');
  t.equal(res1, res2);
  t.equal(res1, 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
});

