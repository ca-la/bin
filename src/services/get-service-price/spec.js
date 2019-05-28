'use strict';

const { test } = require('../../test-helpers/fresh');
const { getServiceBasePrice } = require('./index');

const prices = [
  {
    complexityLevel: 1,
    id: '123',
    minimumUnits: 0,
    priceCents: 123,
    priceUnit: 'GARMENT',
    serviceId: 'WASH',
    setupCostCents: 0,
    vendorUserId: '123'
  },
  {
    complexityLevel: 1,
    id: '456',
    minimumUnits: 100,
    priceCents: 456,
    priceUnit: 'GARMENT',
    serviceId: 'WASH',
    setupCostCents: 0,
    vendorUserId: '123'
  },
  {
    complexityLevel: 1,
    id: '789',
    minimumUnits: 50,
    priceCents: 789,
    priceUnit: 'GARMENT',
    serviceId: 'WASH',
    setupCostCents: 0,
    vendorUserId: '123'
  }
];

test('getServiceBasePrice returns the first eligible bucket', async t => {
  const price = getServiceBasePrice({
    productionPrices: prices,
    serviceId: 'WASH',
    unitsToProduce: 75,
    complexityLevel: 1
  });

  t.equal(price.id, '789');
});

test('getServiceBasePrice throws if no matching complexity is found', async t => {
  t.throws(() =>
    getServiceBasePrice({
      productionPrices: prices,
      serviceId: 'WASH',
      unitsToProduce: 75,
      complexityLevel: 0
    })
  );
});

test('getServiceBasePrice throws if no matching service is found', async t => {
  t.throws(() =>
    getServiceBasePrice({
      productionPrices: prices,
      serviceId: 'DYE',
      unitsToProduce: 75,
      complexityLevel: 1
    })
  );
});
