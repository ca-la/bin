'use strict';

const { test } = require('../../test-helpers/fresh');
const { getServiceMarginCents } = require('./index');

test('getServiceMarginCents returns appropriate margins', async (t) => {
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
    2179
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 49
    }),
    2179
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 50
    }),
    2010
  );

  t.equal(
    getServiceMarginCents({
      serviceId: 'PRODUCTION',
      partnerPriceCents: 12345,
      unitsToProduce: 51
    }),
    2010
  );
});
