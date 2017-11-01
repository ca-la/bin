'use strict';

const { test } = require('../../test-helpers/fresh');
const getCutAndSewCost = require('./index');

const ok = Promise.resolve();

test('getCutAndSewCost returns values based on units & complexity', (t) => {
  t.equal(getCutAndSewCost(0, 0), 6000);
  t.equal(getCutAndSewCost(1, 0), 6000);
  t.equal(getCutAndSewCost(24, 0), 6000);
  t.equal(getCutAndSewCost(25, 0), 3500);
  t.equal(getCutAndSewCost(26, 0), 3500);
  t.equal(getCutAndSewCost(1000, 0), 2100);

  t.equal(getCutAndSewCost(0, 1), 12000);
  t.equal(getCutAndSewCost(1000, 1), 2250);

  t.equal(getCutAndSewCost(0, 2), 22000);
  t.equal(getCutAndSewCost(1000, 2), 4600);

  t.equal(getCutAndSewCost(0, 3), 9150);
  t.equal(getCutAndSewCost(1000, 3), 7400);

  t.equal(getCutAndSewCost(0, 4), 16500);
  t.equal(getCutAndSewCost(1000, 4), 16500);

  return ok;
});
