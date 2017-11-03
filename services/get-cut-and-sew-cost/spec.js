'use strict';

const { test } = require('../../test-helpers/fresh');
const getCutAndSewCost = require('./index');

const ok = Promise.resolve();

test('getCutAndSewCost returns values based on units & complexity', (t) => {
  t.equal(getCutAndSewCost(0, 0), 8750);
  t.equal(getCutAndSewCost(4, 0), 8750);
  t.equal(getCutAndSewCost(5, 0), 8000);
  t.equal(getCutAndSewCost(6, 0), 8000);
  t.equal(getCutAndSewCost(10000, 0), 1800);

  t.equal(getCutAndSewCost(0, 1), 17500);
  t.equal(getCutAndSewCost(10000, 1), 3800);

  t.equal(getCutAndSewCost(0, 2), 27500);
  t.equal(getCutAndSewCost(10000, 2), 5400);

  t.equal(getCutAndSewCost(0, 3), 40000);
  t.equal(getCutAndSewCost(10000, 3), 6400);

  t.equal(getCutAndSewCost(0, 4), 65000);
  t.equal(getCutAndSewCost(10000, 4), 10300);

  return ok;
});
