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
    10
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'WASH',
      partnerPriceCents: 100,
      unitsToProduce: 0
    }),
    10
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 0
    }),
    4938
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 99
    }),
    4938
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 100
    }),
    4691
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 101
    }),
    4691
  );

  return ok;
});
