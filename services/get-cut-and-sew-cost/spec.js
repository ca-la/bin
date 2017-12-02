'use strict';

const { test } = require('../../test-helpers/fresh');
const getCutAndSewCost = require('./index');

const ok = Promise.resolve();

test('getCutAndSewCost returns values based on units & complexity', (t) => {
  t.equal(getCutAndSewCost(0, 0), 0);
  t.equal(getCutAndSewCost(4, 0), 0);
  t.equal(getCutAndSewCost(5, 0), 0);
  t.equal(getCutAndSewCost(6, 0), 0);
  t.equal(getCutAndSewCost(10000, 0), 0);

  t.equal(getCutAndSewCost(0, 1), 2300);
  t.equal(getCutAndSewCost(4, 1), 2300);
  t.equal(getCutAndSewCost(5, 1), 2100);
  t.equal(getCutAndSewCost(6, 1), 2100);
  t.equal(getCutAndSewCost(10000, 1), 700);

  t.equal(getCutAndSewCost(0, 2), 4500);
  t.equal(getCutAndSewCost(10000, 2), 1100);

  t.equal(getCutAndSewCost(0, 3), 6700);
  t.equal(getCutAndSewCost(10000, 3), 1500);

  t.equal(getCutAndSewCost(0, 4), 8900);
  t.equal(getCutAndSewCost(10000, 4), 2100);

  t.equal(getCutAndSewCost(0, 5), 11100);
  t.equal(getCutAndSewCost(10000, 5), 2600);

  t.equal(getCutAndSewCost(0, 6), 17800);
  t.equal(getCutAndSewCost(10000, 6), 4200);

  t.equal(getCutAndSewCost(0, 7), 22300);
  t.equal(getCutAndSewCost(10000, 7), 7500);

  t.equal(getCutAndSewCost(0, 8), 26700);
  t.equal(getCutAndSewCost(10000, 8), 11100);

  t.equal(getCutAndSewCost(0, 9), 35600);
  t.equal(getCutAndSewCost(10000, 9), 13200);

  t.equal(getCutAndSewCost(0, 10), 44500);
  t.equal(getCutAndSewCost(10000, 10), 15400);

  t.equal(getCutAndSewCost(0, 11), 107700);
  t.equal(getCutAndSewCost(10000, 11), 23100);

  return ok;
});
