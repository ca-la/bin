'use strict';

const normalizeEmail = require('./index');
const { test } = require('../../test-helpers/fresh');

const ok = Promise.resolve();

test('normalizeEmail normalizes emails', (t) => {
  t.equal(normalizeEmail('  D@CA.LA '), 'd@ca.la');
  t.equal(normalizeEmail('d@ca.la '), 'd@ca.la');
  t.equal(normalizeEmail('d@ca.la'), 'd@ca.la');

  return ok;
});
