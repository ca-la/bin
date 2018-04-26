'use strict';

const normalizeEmail = require('./index');
const { test } = require('../../test-helpers/fresh');

test('normalizeEmail normalizes emails', async (t) => {
  t.equal(normalizeEmail('  D@CA.LA '), 'd@ca.la');
  t.equal(normalizeEmail('d@ca.la '), 'd@ca.la');
  t.equal(normalizeEmail('d@ca.la'), 'd@ca.la');
});
