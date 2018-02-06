'use strict';

const { requireValues } = require('../require-properties');

function getServicePrice({
  productionPrices,
  serviceId,
  unitsToProduce,
  complexityLevel
}) {
  requireValues({ productionPrices, serviceId, unitsToProduce, complexityLevel });

  // The list of buckets sorted high -> low by the minimum units, so the first
  // bucket we hit that's *lower* than the units to produce is the one we want
  const buckets = productionPrices
    .filter(price =>
      price.serviceId === serviceId &&
      price.complexityLevel === complexityLevel
    )
    .sort((a, b) =>
      b.minimumUnits - a.minimumUnits
    );

  for (const bucket of buckets) {
    if (bucket.minimumUnits <= unitsToProduce) {
      return bucket;
    }
  }

  throw new Error(`No eligible bucket found for ${unitsToProduce}/${complexityLevel}`);
}

module.exports = getServicePrice;
