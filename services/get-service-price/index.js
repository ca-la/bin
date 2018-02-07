'use strict';

const { requireValues } = require('../require-properties');

class NoBucketError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = 'NoBucketError';
  }
}

// Get the price of a given service, given the list of tiers
// IMPORTANT: This returns the price *without* CALA's margin. We should not show
// this value to the customer.
function getServiceBasePrice({
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

  throw new NoBucketError(`No eligible bucket found for ${unitsToProduce}/${complexityLevel}`);
}

module.exports = {
  getServiceBasePrice,
  NoBucketError
};
