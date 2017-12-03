'use strict';

const { test } = require('../../test-helpers/fresh');
const getCutAndSewCost = require('./index');

const ok = Promise.resolve();

test('getCutAndSewCost returns values based on units & complexity', (t) => {
  t.equal(getCutAndSewCost(0, 0), 8600);
  t.equal(getCutAndSewCost(4, 0), 8600);
  t.equal(getCutAndSewCost(5, 0), 7800);
  t.equal(getCutAndSewCost(6, 0), 7800);
  t.equal(getCutAndSewCost(10000, 0), 1600);

  t.equal(getCutAndSewCost(0, 1), 13200);
  t.equal(getCutAndSewCost(10000, 1), 2500);

  t.equal(getCutAndSewCost(0, 2), 26600);
  t.equal(getCutAndSewCost(10000, 2), 5000);

  t.equal(getCutAndSewCost(0, 3), 39600);
  t.equal(getCutAndSewCost(10000, 3), 7400);

  t.equal(getCutAndSewCost(0, 4), 63000);
  t.equal(getCutAndSewCost(10000, 4), 11800);

  return ok;
});
