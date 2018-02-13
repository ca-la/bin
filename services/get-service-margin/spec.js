'use strict';

const { test } = require('../../test-helpers/fresh');
const { getServiceMarginCents } = require('./index');

const ok = Promise.resolve();

test('getServiceMarginCents returns appropriate margins', (t) => {
  t.equal(
    getServiceMarginCents({
      serviceId: 'WASH',
      partnerPriceCents: 100,
      unitsToProduce: 100
    }),
    11
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'WASH',
      partnerPriceCents: 100,
      unitsToProduce: 0
    }),
    11
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 0
    }),
    8230
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 99
    }),
    8230
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 100
    }),
    7566
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 101
    }),
    7566
  );

  return ok;
});
